"""Align an already chosen transcript to local CTC acoustics; never replace its words."""
import unicodedata
import uuid

import kaldi_native_fbank as knf
import numpy as np
import onnxruntime as ort


def transcript_tokens(text, vocabulary):
    """Retain exact display spans, ignoring only punctuation/spacing for acoustic alignment."""
    units = []
    index = 0
    start = 0
    while index < len(text):
        char = text[index]
        if char.isspace() or unicodedata.category(char).startswith('P'):
            index += 1
            if units:
                units[-1]['end'] = index
                start = index
            continue
        limit = min(len(text), index + 28)
        match = None
        for end in range(limit, index, -1):
            piece = text[index:end]
            if any(c.isspace() or unicodedata.category(c).startswith('P') for c in piece):
                continue
            candidates = [piece]
            if index == 0 or not text[index - 1].isascii() or text[index - 1].isspace():
                candidates.insert(0, '▁' + piece)
            for candidate in candidates:
                if candidate in vocabulary and not candidate.startswith('<'):
                    match = (end, vocabulary[candidate])
                    break
            if match:
                break
        if not match:
            raise ValueError('Transcript contains a token that cannot be acoustically aligned')
        end, token = match
        units.append({'id': token, 'start': start, 'end': end})
        index = start = end
    if not units:
        raise ValueError('Transcript contains no alignable speech')
    return units


def ctc_spans(logits, target, blank=0):
    """Bounded CTC Viterbi path, including blank separation for repeated characters."""
    if not target or len(target) > len(logits):
        raise ValueError('Transcript is longer than the available acoustic frames')
    states = np.full(2 * len(target) + 1, blank, dtype=np.int32)
    states[1::2] = target
    scores = np.full(len(states), -np.inf)
    scores[0] = 0
    trace = np.zeros((len(logits), len(states)), dtype=np.uint8)
    skip = np.zeros(len(states), dtype=bool)
    skip[2:] = (states[2:] != states[:-2]) & (states[2:] != blank)
    for frame, emission in enumerate(logits):
        choices = np.stack([scores, np.r_[-np.inf, scores[:-1]], np.r_[-np.inf, -np.inf, scores[:-2]]])
        choices[2, ~skip] = -np.inf
        step = choices.argmax(axis=0)
        scores = choices[step, np.arange(len(states))] + emission[states]
        trace[frame] = step
    state = len(states) - (1 if scores[-1] > scores[-2] else 2)
    if not np.isfinite(scores[state]):
        raise ValueError('No complete acoustic alignment exists')
    spans = [[len(logits), -1] for _ in target]
    for frame in range(len(logits) - 1, -1, -1):
        if state % 2:
            span = spans[state // 2]
            span[0] = min(span[0], frame)
            span[1] = max(span[1], frame + 1)
        state -= int(trace[frame, state])
    if any(end <= start for start, end in spans):
        raise ValueError('Incomplete acoustic token alignment')
    return spans


def caption_groups(text, units, spans, start_ms, end_ms):
    """Short captions follow real acoustic boundaries, rather than evenly divided text."""
    output = []
    first = 0
    for index, unit in enumerate(units):
        next_index = index + 1
        end_sentence = text[unit['start']:unit['end']].rstrip().endswith(('。', '！', '？', '，', '；', '.', '!', '?', ',', ';'))
        should_end = next_index == len(units) or end_sentence
        if next_index < len(units):
            should_end |= units[next_index]['end'] - units[first]['start'] > 14
            should_end |= (spans[next_index][0] - spans[index][1]) * 60 > 600
        if not should_end:
            continue
        caption = text[units[first]['start']:unit['end']].strip()
        begin = start_ms + spans[first][0] * 60
        finish = min(end_ms, start_ms + spans[index][1] * 60 + 250)
        if next_index < len(units):
            finish = min(finish, start_ms + spans[next_index][0] * 60)
        if not caption or len(caption) > 28 or finish <= begin:
            raise ValueError('Aligned caption is outside the display contract')
        output.append({'id': str(uuid.uuid4()), 'text': caption, 'startMs': begin,
                       'endMs': finish, 'timestampMs': None, 'confidence': None})
        first = next_index
    return output


class AcousticAligner:
    """Reuse the pinned SenseVoice model only for timestamps after Nano has exited."""
    def __init__(self, model_dir):
        options = ort.SessionOptions()
        options.intra_op_num_threads = 1
        options.inter_op_num_threads = 1
        options.enable_cpu_mem_arena = False
        self.session = ort.InferenceSession(str(model_dir / 'model.int8.onnx'), sess_options=options,
                                            providers=['CPUExecutionProvider'])
        self.metadata = self.session.get_modelmeta().custom_metadata_map
        self.vocabulary = {word: int(token) for word, token in
                           (line.rsplit(' ', 1) for line in (model_dir / 'tokens.txt').read_text().splitlines())}
        self.mean = np.fromstring(self.metadata['neg_mean'], sep=',', dtype=np.float32)
        self.scale = np.fromstring(self.metadata['inv_stddev'], sep=',', dtype=np.float32)

    def align(self, samples, text, start_ms, end_ms):
        if len(samples) > 31 * 16000:
            raise ValueError('Acoustic window exceeds the bounded speech segment')
        options = knf.FbankOptions()
        options.frame_opts.dither = 0
        options.frame_opts.window_type = 'hamming'
        options.frame_opts.snip_edges = True
        options.mel_opts.num_bins = 80
        options.mel_opts.high_freq = 0
        bank = knf.OnlineFbank(options)
        bank.accept_waveform(16000, samples.astype(np.float32).tolist())
        bank.input_finished()
        if bank.num_frames_ready < 7:
            raise ValueError('Speech segment is too short for alignment')
        features = np.stack([bank.get_frame(i) for i in range(bank.num_frames_ready)])
        features = np.stack([features[i:i + 7].reshape(-1) for i in range(0, len(features) - 6, 6)])
        features = (features + self.mean) * self.scale
        logits = self.session.run(None, {'x': features[None],
            'x_length': np.array([len(features)], dtype=np.int32),
            'language': np.array([int(self.metadata['lang_zh'])], dtype=np.int32),
            'text_norm': np.array([int(self.metadata['with_itn'])], dtype=np.int32)})[0][0, 4:]
        units = transcript_tokens(text, self.vocabulary)
        spans = ctc_spans(logits, [unit['id'] for unit in units])
        return caption_groups(text, units, spans, start_ms, end_ms)
