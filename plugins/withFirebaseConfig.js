const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFirebasePodfile(config) {
    return withDangerousMod(config, [
        'ios',
        (config) => {
            const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
            let podfile = fs.readFileSync(podfilePath, 'utf8');

            // Add use_modular_headers! and GoogleUtilities modular header if not already present
            if (!podfile.includes('use_modular_headers!')) {
                podfile = podfile.replace(
                    /^(platform :ios,.+)$/m,
                    `$1\nuse_modular_headers!`
                );
                fs.writeFileSync(podfilePath, podfile);
            }

            return config;
        },
    ]);
};