/** Dedicated Remotion entry keeps the free-video template independent from photo-cache identities. */
import { Composition, Still, registerRoot } from 'remotion';

import { EMPTY_VIDEO_EDIT } from '../services/definition/video-edit';

import { VideoEditFilm, VideoEditCover, VideoEditGraphics } from './video-edit';
import { getVideoEditTimeline } from './video-edit-timeline';

/** The business app owns editable values; these are controlled registrations, not source-authored clip instances. */
function VideoEditRoot() {
  return (
    <>
      <Composition
        id="FreeVideoTour"
        component={VideoEditFilm}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={1}
        defaultProps={{ project: EMPTY_VIDEO_EDIT }}
        calculateMetadata={({ props }) => ({
          durationInFrames: getVideoEditTimeline(props.project).frames,
        })}
      />
      <Composition
        id="FreeVideoGraphics"
        component={VideoEditGraphics}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={1}
        defaultProps={{ project: EMPTY_VIDEO_EDIT }}
        calculateMetadata={({ props }) => ({
          durationInFrames: getVideoEditTimeline(props.project).frames,
        })}
      />
      <Still
        id="FreeVideoCover"
        component={VideoEditCover}
        width={1080}
        height={1920}
        defaultProps={{ project: EMPTY_VIDEO_EDIT }}
      />
    </>
  );
}
registerRoot(VideoEditRoot);
