/**
 * "Bundle React Native code and images" 단계의 백틱 실행을 인용된 명령 치환으로 바꾼다 — CLAUDE.md §11-③.
 *
 * 이 프로젝트는 공백이 든 경로(`/Volumes/P31 2TB/…`)에 있다. 템플릿은
 *   `"$NODE_BINARY" --print "…/react-native-xcode.sh'"`
 * 로 스크립트 경로를 만들어 그대로 실행하는데, 백틱 결과는 인용되지 않아 공백에서 쪼개진다
 * (`bash: /Volumes/P31: No such file or directory`).
 *
 * `ios/`는 gitignore된 생성물이라 손으로 고친 건 `expo prebuild --clean`에서 사라진다.
 * 그래서 prebuild가 프로젝트를 만들 때마다 여기서 고친다. ①②는 patches/가 맡는다.
 *
 * 이미 고쳐진 프로젝트에는 아무것도 하지 않는다. 템플릿이 바뀌어 원문을 못 찾으면 조용히
 * 넘어가지 않고 경고한다 — 그때는 빌드가 깨질 수 있으니 §11을 다시 봐야 한다.
 */
const { withXcodeProject, WarningAggregator } = require('expo/config-plugins');

const BACKTICK = /`(\\"\$NODE_BINARY\\" --print \\"[^`]*react-native-xcode\.sh'\\")`/;
const QUOTED = /\\"\$\(\\"\$NODE_BINARY\\" --print \\"[^"]*react-native-xcode\.sh'\\"\)\\"/;

module.exports = function withQuotedBundleScript(config) {
  return withXcodeProject(config, (cfg) => {
    const phases = cfg.modResults.hash.project.objects.PBXShellScriptBuildPhase ?? {};
    let found = false;

    for (const phase of Object.values(phases)) {
      if (typeof phase !== 'object' || typeof phase.shellScript !== 'string') continue;
      if (QUOTED.test(phase.shellScript)) {
        found = true;
        continue;
      }
      if (BACKTICK.test(phase.shellScript)) {
        // 함수로 넘긴다 — 문자열로 넘기면 `$(`의 `$`가 치환 패턴으로 읽힌다
        phase.shellScript = phase.shellScript.replace(BACKTICK, (_, cmd) => `\\"$(${cmd})\\"`);
        found = true;
      }
    }

    if (!found) {
      WarningAggregator.addWarningIOS(
        'withQuotedBundleScript',
        'react-native-xcode.sh 호출을 찾지 못했다. 템플릿이 바뀌었다면 CLAUDE.md §11-③을 확인하라.',
      );
    }
    return cfg;
  });
};
