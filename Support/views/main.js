!function () {

    var keys
        , timer
        , timeout = 300
        , issueURLs = []
        , issueIndex = ''
        ;

    var issues = Array.prototype.slice.call( document.querySelectorAll( '.issue' ) );

    function range( start, count, obj ) {

        Array.apply( 0, Array( count ) ).forEach( function ( val, index ) {
            obj[ index + start ] = index;
        });

        return obj;
    }

    function goToIssue( index ) {

        issueIndex = '';
        window.location.assign( issueURLs[ index ] );

        return;
    }

    keys = range( 48, 10, {} );
    keys = range( 96, 10, keys );

    issues.forEach( function ( issue ) {

        issueURLs.push( issue.getAttribute( 'data-file' ) );

        issue.addEventListener( 'click', function (e) {

            if ( e.target.classList.contains( 'rule-id' ) ) return;

            var index = issues.reduce( function ( prev, node, index ) {

                if ( node == e.currentTarget ) {
                    return index;
                }

                return prev;

            }, undefined );

            goToIssue( index );
        });
    });

    document.addEventListener( 'keydown', function ( e ) {

        var num = keys[ e.which ];

        if ( num === undefined ) return;

        issueIndex += num;

        clearTimeout( timer );

        timer = setTimeout( function() {

        	goToIssue( issueIndex - 1 );

        }, timeout );

    });

}();