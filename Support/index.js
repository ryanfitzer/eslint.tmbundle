/**
 * ESLint bundle for Textmate
 */
const path = require( 'path' );
const handlebars = require( 'handlebars' );
const fsp = require( './lib/fsp' );

const TMbundleSupport = process.env.TM_BUNDLE_SUPPORT;
const TMfilePath = process.env.TM_FILEPATH;
const TMprojectDir = process.env.TM_PROJECT_DIRECTORY;

const TMcwd = process.env.TM_eslint_cwd;
const TMfix = process.env.TM_eslint_fix;
const TMeslintPath = process.env.TM_eslint_path;
const TMconfigFile = process.env.TM_eslint_config_file;
const TMignorePath = process.env.TM_eslint_ignore_path;
const TMuseEslintrc = process.env.TM_eslint_use_eslintrc;
const TMignorePattern = process.env.TM_eslint_ignore_pattern;
const TMbaseConfigFile = process.env.TM_eslint_base_config_file;

const eslintPathRel = TMeslintPath ? TMeslintPath : 'node_modules/eslint';
const eslintPath = path.resolve( TMprojectDir, eslintPathRel );
const viewsPath = path.resolve( TMbundleSupport, 'views' );
const imagesPath = path.resolve( TMbundleSupport, 'images' );
const eslintLogo = `file://${imagesPath}/eslint.svg`;
const cssMain = `file://${viewsPath}/main.css?cacheBuster=${Date.now()}`;
const cssGithub = `file://${TMbundleSupport}/../node_modules/github-markdown-css/github-markdown.css?cacheBuster=${Date.now()}`;

let CLIEngine;

function createCLI() {

    const options = {
        fix: false,
        useEslintrc: true,
        cwd: TMcwd ? path.resolve( TMprojectDir, TMcwd ) : TMprojectDir
    };

    // Fail silently if no eslint is found
    try {
        CLIEngine = require( eslintPath ).CLIEngine;
    }
    catch ( err ) {
        return false;
    }

    if ( TMfix ) {
        options.fix = /true/i.test( TMfix );
    }

    if ( TMuseEslintrc ) {
        options.fix = /true/i.test( TMuseEslintrc );
    }

    if ( TMignorePattern ) {

        options.ignorePattern = TMignorePattern
        .split( ',' )
        .map( path => path.trim() );
    }

    if ( TMignorePath ) {
        options.ignorePath = path.resolve( TMprojectDir, TMignorePath );
    }

    if ( TMconfigFile ) {
        options.configFile = path.resolve( TMprojectDir, TMconfigFile );
    }

    if ( TMbaseConfigFile ) {
        options.baseConfig = require( path.resolve( TMprojectDir, TMbaseConfigFile ) );
    }

    return new CLIEngine( options );
}

function composeData( report ) {

    let eslintVersion;
    const issueCount = report.errorCount + report.warningCount;

    return {
        issueCount: issueCount,
        isPlural: issueCount > 1,
        errorCount: report.errorCount,
        warningCount: report.warningCount,
        messages: report.results[0].messages,
        file: path.parse( TMfilePath ).base,
        filepathAbs: TMfilePath,
        filepathRel: path.relative( TMprojectDir, TMfilePath ),
        eslintPath: eslintPath,
        eslintLogo: eslintLogo,
        eslintVersion: require( `${eslintPath}/package.json` ).version,
        css: {
            main: cssMain,
            github: cssGithub
        }
    };
}

module.exports = function ( config ) {

    let data;
    let error = false;
    let report = null;
    const cli = createCLI();
    const viewPath = path.join( TMbundleSupport, `${config.view}.hbs` );

    if ( !cli || cli.isPathIgnored( TMfilePath ) ) {
        return;
    }

    // Make sure ESLint is configured
    try {
        report = cli.executeOnFiles( [ TMfilePath ] );
    }
    catch ( err ) {
        error = err;
        /*
            TODO Possible errors that need to be handled:
                - No configuration provided (root .eslintrc* or TM_eslint_base_config_file set).
                - TM_eslint_base_config_file set, but not found.
                - Invalid configuration (via .eslintrc* or TM_eslint_base_config_file).

            Test each scenario to see if each scenario can be discerned from the error provided by ESLint.
        */
    }

    if ( cli.options.fix ) CLIEngine.outputFixes( report );

    data = composeData( report );

    // Debug
    // return process.stdout.write( `<pre>${JSON.stringify( cli, null, 2 )}</pre>` );

    if ( config.view === 'tooltip' && !data.errorCount ) return;

    fsp.readFile( `${viewsPath}/${config.view}.hbs` ).then( function ( src ) {

        return process.stdout.write(
            handlebars.compile( src )( composeData( report ) )
        );
    });
}
