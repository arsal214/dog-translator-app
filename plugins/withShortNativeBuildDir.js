// Windows only: Android native (CMake/ninja) object paths embed the full source path and blow past the
// 260-char limit under deep node_modules paths (react-native-reanimated, gesture-handler codegen...).
// Redirect every CMake build dir to <drive>:\rn-cxx\<module>. No-op on macOS/Linux/EAS builders.
const { withProjectBuildGradle, withAppBuildGradle } = require('expo/config-plugins');

const WIN = 'org.gradle.internal.os.OperatingSystem.current().isWindows()';
const MARK = '// short-native-build-dir';

const root = `
${MARK}
if (${WIN}) {
  subprojects { p ->
    p.pluginManager.withPlugin('com.android.library') {
      try {
        p.android.externalNativeBuild.cmake.buildStagingDirectory = new File(rootDir.toPath().getRoot().toFile(), "rn-cxx/\${p.name}")
      } catch (Throwable ex) { println("short-native-build-dir \${p.name}: \${ex.message}") }
    }
  }
}
`;

const app = `
    ${MARK}
    if (${WIN}) {
        externalNativeBuild {
            cmake {
                buildStagingDirectory = new File(rootDir.toPath().getRoot().toFile(), "rn-cxx/app")
            }
        }
    }
`;

module.exports = (config) => {
  config = withProjectBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes(MARK)) c.modResults.contents += root;
    return c;
  });
  return withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes(MARK)) {
      c.modResults.contents = c.modResults.contents.replace(/(\n\s*namespace\s+['"][^'"]+['"])/, `$1\n${app}`);
    }
    return c;
  });
};
