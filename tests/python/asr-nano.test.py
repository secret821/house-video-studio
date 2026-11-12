"""No model/network: verify acoustic alignment, exact text retention and bounded source segments."""
import importlib.util
from pathlib import Path
import sys
import unittest

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'scripts'))
from asr_nano_alignment import caption_groups, ctc_spans, transcript_tokens

spec = importlib.util.spec_from_file_location('nano_inference', Path(__file__).resolve().parents[2] / 'scripts' / 'asr-nano-inference.py')
nano = importlib.util.module_from_spec(spec)
spec.loader.exec_module(nano)


class NanoAlignmentTest(unittest.TestCase):
    def test_repeated_characters_require_blank_and_follow_audio_not_uniform_time(self):
        logits = np.full((14, 3), -20.0)
        logits[:, 0] = 0
        logits[1, 1] = 10
        logits[9, 1] = 10
        logits[12, 2] = 10
        self.assertEqual(ctc_spans(logits, [1, 1, 2]), [[1, 2], [9, 10], [12, 13]])
        with self.assertRaises(ValueError):
            ctc_spans(np.ones((2, 3)), [1, 1])

    def test_text_and_punctuation_survive_grouping_with_silence_gap(self):
        text = '这个院子，很好。'
        units = transcript_tokens(text, {char: index + 1 for index, char in enumerate('这个院子很好')})
        captions = caption_groups(text, units, [[1, 2], [3, 4], [5, 6], [7, 8], [40, 41], [44, 45]], 100, 3000)
        self.assertEqual(''.join(c['text'] for c in captions), text)
        self.assertEqual(len(captions), 2)
        self.assertLess(captions[0]['endMs'], captions[1]['startMs'])
        self.assertLessEqual(captions[-1]['endMs'], 3000)
        self.assertEqual(captions[1]['startMs'], 2500)

    def test_continuous_speech_is_grouped_within_existing_caption_contract(self):
        text = '一' * 50
        units = transcript_tokens(text, {'一': 1})
        spans = [[i * 2, i * 2 + 1] for i in range(50)]
        captions = caption_groups(text, units, spans, 2000, 9000)
        self.assertEqual(''.join(c['text'] for c in captions), text)
        self.assertTrue(all(len(c['text']) <= 14 for c in captions))
        self.assertTrue(all(a['endMs'] <= b['startMs'] for a, b in zip(captions, captions[1:])))

    def test_numbers_and_english_keep_display_spans(self):
        text = '211号，A区。'
        units = transcript_tokens(text, {'▁211': 1, '号': 2, '▁A': 3, '区': 4})
        self.assertEqual([unit['id'] for unit in units], [1, 2, 3, 4])
        self.assertEqual(''.join(text[u['start']:u['end']] for u in units), text)
        with self.assertRaises(ValueError):
            transcript_tokens('不存在', {'存': 1})

    def test_bad_runtime_segments_fail_instead_of_fabricating_times(self):
        self.assertEqual(nano.parse_srt('', 1000), [])
        self.assertEqual(nano.parse_srt('1\n00:00:00,100 --> 00:00:01,100\n你好\n', 1000), [(100, 1000, '你好')])
        for source in ['bad', '1\n00:00:00,000 --> 00:00:40,000\n你好',
                       '1\n00:00:02,000 --> 00:00:01,000\n你好',
                       '1\n00:00:00,000 --> 00:00:01,000\n一\n\n2\n00:00:00,500 --> 00:00:02,000\n二']:
            with self.assertRaises(ValueError):
                nano.parse_srt(source, 60_000)


if __name__ == '__main__':
    unittest.main()
