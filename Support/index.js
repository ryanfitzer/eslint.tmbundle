/**
 * ESLint bundle for Textmate
 *
 * @todo Support marks
 *      `"$TM_MATE" --set-mark "$TM_APP_PATH/Contents/Resources/TextMate.icns" --line 3`
 *      `"$TM_MATE" --clear-mark "$TM_APP_PATH/Contents/Resources/TextMate.icns" --line 3`
 */
const path = require( 'path' );
const handlebars = require( 'handlebars' );
const fsp = require( './lib/fsp' );

const TMbundleSupport = process.env.TM_BUNDLE_SUPPORT;
const TMfilePath = process.env.TM_FILEPATH;
const TMprojectDir = process.env.TM_PROJECT_DIRECTORY;

const TMcwd = process.env.TM_eslint_cwd;
const TMfix = process.env.TM_eslint_fix;
const TMdebug = process.env.TM_eslint_debug;
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
const scriptMain = `file://${viewsPath}/main.js?cacheBuster=${Date.now()}`;

let CLIEngine;
const bundleErrors = [];

function requireTry( modulePath ) {

    let result;

    try {
        result = require( modulePath );
    }
    catch ( err ) {

        if ( TMdebug ) {
            process.stdout.write( `${err}\n` );
        }
    }

    return result;
}

function createCLI() {

    const eslintModule = requireTry( eslintPath );
    const options = {
        fix: false,
        useEslintrc: true,
        cwd: TMcwd ? path.resolve( TMprojectDir, TMcwd ) : TMprojectDir
    };

    if ( eslintModule ) {
        CLIEngine = eslintModule.CLIEngine;
    }
    else {
        bundleErrors.push( `Error: Cannot find module <code>${eslintPath}</code>` );
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

    if ( !CLIEngine ) return false;

    return new CLIEngine( options );
}

function composeData( report ) {

    const hasReport = Object.keys( report || {} ).length;
    const eslintPkg = requireTry( `${eslintPath}/package.json` );
    const result = {
        file: path.parse( TMfilePath ).base,
        filepathAbs: TMfilePath,
        filepathRel: path.relative( TMprojectDir, TMfilePath ),
        eslintPath: eslintPath,
        eslintLogo: eslintLogo,
        eslintVersion: eslintPkg ? eslintPkg.version : '?',
        cssMain: cssMain,
        scriptMain: scriptMain,
        bundleErrors: bundleErrors
    };

    if ( hasReport ) {

        const issueCount = report.errorCount + report.warningCount;

        const messages = report.results[0].messages.map( ( msg, index ) => {

            const leadSpace = msg.source.match( /^\s*/ );
            const count = leadSpace ? leadSpace[ 0 ].length : 0;
            const pad = msg.column > count ? msg.column - count - 1 : 0;

            msg.count = index + 1;
            msg.isESLintRule = msg.ruleId && msg.ruleId.search( '/' ) < 0;
            msg.pointer = `${Array( pad ).fill( '.' ).join( '' )}^`;
            msg.source = msg.source.trim();
            msg.messageHTML = msg.message.replace( /'(.*?)'/g, ( match, code ) => {
                return `<code>${code}</code>`;
            });

            return msg;
        });

        Object.assign( result, {
            issueCount: issueCount,
            isPlural: issueCount !== 1,
            errorCount: report.errorCount,
            warningCount: report.warningCount,
            messages: messages,
        })
    }

    return result;
}

module.exports = function ( config ) {

    let data;
    let report = null;
    const cli = createCLI();
    const view = fsp.readFile( `${viewsPath}/${config.view}.hbs` );

    const render = function( src ) {

        const template = handlebars.compile( src );
        const hrend = process.hrtime( config.hrstart );

        data = data || composeData();

        data.time = `${hrend[0]}s ${Math.floor( hrend[1]/1000000 )}ms`;

        return process.stdout.write( template( data ) );
    }

    if ( TMdebug ) {
        process.stdout.write( `<h1>ESLint.tmbundle Debug</h1>` );
        process.stdout.write( `<h2><code>cli</code></h2><pre>${JSON.stringify( cli, null, 2 )}</pre>` );
    }

    if ( !cli ) {

        bundleErrors.push( 'Error: No <code>CLIEngine</code> found.' );

        if ( config.view === 'window' ) view.then( render );

        return;
    }

    if ( cli.isPathIgnored( TMfilePath ) ) {

        bundleErrors.push( `Error: Path ignored: <code>${TMfilePath}</code>.` );

        if ( config.view === 'window' ) view.then( render );

        return;
    }

    // Make sure ESLint is configured
    try {
        report = cli.executeOnFiles( [ TMfilePath ] );
    }
    catch ( err ) {

        /*
            TODO Possible errors that need to be handled:
                - TM_eslint_base_config_file set, but not found.
                - Invalid configuration (via .eslintrc* or TM_eslint_base_config_file).

            Test each scenario to see if each scenario can be discerned from the error provided by ESLint.
        */

        bundleErrors.push( `${err}` );
    }

    // No configuration provided (.eslintrc* or TM_eslint_base_config_file).
    if ( report === null ) {

        bundleErrors.push( 'Error: No ESLint configuration provided (<code>.eslintrc*</code>).' );

        if ( config.view === 'window' ) view.then( render );

        return;
    }

    if ( cli.options.fix ) CLIEngine.outputFixes( report );

    data = composeData( report );

    if ( TMdebug ) {
        process.stdout.write( `<h2><code>data</code></h2><pre>${JSON.stringify( data, null, 2 )}</pre>` );
    }

    if ( config.view === 'tooltip' && !data.errorCount ) return;

    view.then( render );

    // view.then( function ( src ) {
    //
    //     const template = handlebars.compile( src );
    //     const hrend = process.hrtime( config.hrstart );
    //
    //     data.time = `${hrend[0]}s ${Math.floor( hrend[1]/1000000 )}ms`;
    //
    //     return process.stdout.write( template( data ) );
    // });
}
