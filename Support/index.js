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
const TMdir = process.env.TM_DIRECTORY;
const TMprojectDir = process.env.TM_PROJECT_DIRECTORY;

const TMcwd = process.env.TM_eslint_cwd || TMdir;
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

let eslint;
let CLIEngine;
let SourceCode;
const bundleErrors = [];

function requireTry( modulePath, TMconfig ) {

    let result;

    try {
        result = require( modulePath );
    }
    catch ( err ) {

        if ( TMconfig.TMdebug || TMdebug ) {
            process.stdout.write( `${err}\n` );
        }
    }

    return result;
}

function createCLI( TMconfig ) {

    const options = {
        fix: false,
        useEslintrc: true,
        cwd: TMcwd ? path.resolve( TMprojectDir, TMcwd ) : TMprojectDir
    };

    eslint = requireTry( eslintPath, TMconfig );

    if ( eslint ) {
        CLIEngine = eslint.CLIEngine;
        SourceCode = eslint.SourceCode;
    }
    else {
        bundleErrors.push( `Error: Cannot find module <code>${eslintPath}</code>` );
    }

    if ( TMfix ) {
        options.fix = /true/i.test( TMfix );
    }

    if ( TMuseEslintrc ) {
        options.useEslintrc = /true/i.test( TMuseEslintrc );
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

    if ( TMconfig.TMdebug || TMdebug ) {
        process.stdout.write( `<h1>ESLint.tmbundle Debug</h1>` );
        process.stdout.write( `<h2><code>$PATH</code></h2><pre>${process.env.PATH}</pre>` );
        process.stdout.write( `<h2><code>TMconfig</code></h2><pre>${JSON.stringify( TMconfig, null, 2 )}</pre>` );
        process.stdout.write( `<h2><code>CLIEngine v${CLIEngine.version} options</code></h2><pre>${JSON.stringify( options, null, 2 )}</pre>` );
    }

    return new CLIEngine( options );
}

function composeData( report, TMconfig ) {

    const hasReport = Object.keys( report || {} ).length;
    const eslintPkg = requireTry( `${eslintPath}/package.json`, TMconfig );
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

        const fileResult = report.results[0]
        const issueCount = report.errorCount + report.warningCount;
        const fileSrc = fileResult.source || fileResult.output || '';
        const srcLines = SourceCode.splitLines( fileSrc );

        const messages = report.results[0].messages.map( ( msg, index ) => {

            msg.source = srcLines[ msg.line - 1 ];

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

module.exports = function ( TMconfig, stdin ) {

    let data;
    let report = null;
    const cli = createCLI( TMconfig );
    const view = fsp.readFile( `${viewsPath}/${TMconfig.view}.hbs` );

    const render = function( src ) {

        const template = handlebars.compile( src );
        const hrend = process.hrtime( TMconfig.hrstart );

        data = data || composeData( null, TMconfig );

        data.time = `${hrend[0]}s ${Math.floor( hrend[1]/1000000 )}ms`;

        return process.stdout.write( template( data ) );
    }

    if ( !cli ) {

        bundleErrors.push( 'Error: No <code>CLIEngine</code> found.' );

        if ( TMconfig.view === 'window' ) view.then( render );

        return;
    }

    if ( cli.isPathIgnored( TMfilePath ) ) {

        bundleErrors.push( `Error: Path ignored: <code>${TMfilePath}</code>.` );

        if ( TMconfig.view === 'window' ) view.then( render );

        return;
    }

    // Make sure ESLint is configured
    try {
        report = cli.executeOnText( stdin, TMfilePath );
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

        if ( TMconfig.view === 'window' ) view.then( render );

        return;
    }

    CLIEngine.outputFixes( report );

    data = composeData( report, TMconfig );
    data.stdin = stdin;

    if ( TMconfig.TMdebug || TMdebug ) {
        process.stdout.write( `<summary><h2>Report <code>data</code></h2><details><pre>${JSON.stringify( data, null, 2 )}</pre></details></summary>` );
        process.stdout.write( `<summary><h2>ESLint config for <code>${ data.filepathRel }</code></h2><details><pre>${JSON.stringify( cli.getConfigForFile( data.filepathRel ), null, 2 )}</pre></details></summary>` );
        process.stdout.write( `<summary><h2>Source</h2><details><pre>${ stdin }</pre></details></summary>` );
    }

    if ( TMconfig.view === 'tooltip' && !data.errorCount ) return;

    view.then( render );

}
