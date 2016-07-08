const fs = require( 'fs' );

/**
 * @docs https://nodejs.org/api/fs.html#fs_fs_readfile_file_options_callback
 */
module.exports.readFile = function readFile( filePath, options ) {

    return new Promise( function( resolve, reject ) {

        fs.readFile( filePath, options || 'utf8', function( err, data ) {

            if ( err ) return reject( err );

            return resolve( data );
        });
    });
}

/**
 * @docs https://nodejs.org/api/fs.html#fs_fs_writefile_file_data_options_callback
 */
module.exports.writeFile = function writeFile( filePath, data, options ) {

    return new Promise( function ( resolve, reject ) {

        fs.writeFile( filePath, data, options || 'utf8', function ( err ) {

            if ( err ) return reject( err );

            resolve();
        });
    });
}

/**
 * @docs https://nodejs.org/api/fs.html#fs_fs_mkdir_path_mode_callback
 */
module.exports.mkdir = function mkdir( dirPath, mode ) {

    return new Promise( function( resolve, reject ) {

        fs.mkdir( dirPath, mode || '0o777', function( err ) {

            if ( err ) return reject( err );

            resolve();
        });
    });
}

/**
 * @docs https://nodejs.org/api/fs.html#fs_fs_rmdir_path_callback
 */
module.exports.rmdir = function rmdir( dirPath ) {

    return new Promise( function( resolve, reject ) {

        fs.rmdir( dirPath, function( err ) {

            if ( err ) return reject( err );

            resolve();
        });
    });
}

/**
 * @docs https://nodejs.org/api/fs.html#fs_fs_stat_path_callback
 */
module.exports.stat = function stat( filePath ) {

    return new Promise( function( resolve, reject ) {

        fs.stat( filePath, 'utf8', function( err, stats ) {

            if ( err ) return reject( err );

            if ( !stats ) return reject( stats );

            resolve( stats );
        });
    });
}

/**
 * @docs https://nodejs.org/api/fs.html#fs_fs_stat_path_callback
 */
module.exports.isFile = function isFile( filePath ) {

    return stat( filePath ).then( function ( stats ) {

        return stats.isFile();

    });
}

/**
 * @docs https://nodejs.org/api/fs.html#fs_fs_stat_path_callback
 */
module.exports.isDirectory = function isDirectory( filePath ) {

    return stat( filePath ).then( function ( stats ) {

        return stats.isDirectory();

    });
}