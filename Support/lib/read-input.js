module.exports = ( fn ) => {

    let input = '';

    process.stdin.resume();

    process.stdin.on( 'data', ( chunk ) => input += chunk );

    process.stdin.on( 'end', () => fn( input ) );

};