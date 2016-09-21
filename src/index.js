import _isEqual from 'lodash.isequal';

let U;

const applySnapShots = ( snapShots, store, matcherFn ) => {

  snapShots.actions.forEach( act => store.dispatch( act ) );

  matcherFn || ( matcherFn = isEqual);
  let matched = matcherFn( snapShots.lastState, store.getState() );

  if ( matched ) {
    console.group( '%cSnapShots and final State match - Success', 'color:green; font-weight: bold' );
  } else {
    console.group( '%cSnapShots and final State match - Fail', 'color:red; font-weight: bold' );
  }

  console.log( '%cSnapShot last state', 'color:#03A9F4', snapShots.lastState );
  console.log( '%cStore current state', 'color:#4CAF50', store.getState() );
  console.groupEnd();

  if ( !matched ) throw 'SnapShots and final State match - Fail';
};

const RT_PARAMS = [ 'debug', 'matcherFn', 'pickState', 'allStates', 'allErrors', 'onlyConsole', 'noReset' ];

const createRT = () => {
  let
    rt,
    rtParams = {},
    actions, states, errors, snapshotsURL, blobData;

  const resetSnapShotsData = () => {
    actions = [];
    states = [];
    errors = [];
  };

  resetSnapShotsData();

  rt = RT_PARAMS.reduce( ( accm, attr ) => {
    accm[ attr ] = val => {
      rtParams[ attr ] = val;
      return window.rt; // for chaining
    };

    return accm;
  }, {} );

  rt.params = () => console.log( rtParams );

  rt.resetSnapShots = () => resetSnapShotsData();

  rt.getSnapShots = ( name ) => {

    // if no pickState func is provided return whole state
    rtParams.pickState || ( rtParams.pickState = s => s );

    let data = {
      actionSequence: actions.map( action => (action || {}).type ),
      actions       : actions,
      lastState     : rtParams.pickState( states[ states.length - 1 ] ),
      states        : rtParams.allStates ? states.map( rtParams.pickState ) : U,
      errors        : rtParams.allErrors ? errors : U
    };

    !rtParams.noReset && resetSnapShotsData();

    if ( rtParams.onlyConsole ) {
      console.log( data );
      return;
    }

    blobData = new Blob( [ JSON.stringify( data ) ], { type: 'text/plain' } );

    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if ( snapshotsURL !== null ) {
      window.URL.revokeObjectURL( snapshotsURL );
    }

    snapshotsURL = window.URL.createObjectURL( blobData );

    var link = document.createElement( 'a' );
    link.setAttribute( 'download', `${name || 'rtSnapshot'}.js` );
    link.href = snapshotsURL;
    document.body.appendChild( link );

    // wait for the link to be added to the document
    window.requestAnimationFrame( function () {
      var event = new MouseEvent( 'click' );
      link.dispatchEvent( event );
      document.body.removeChild( link );
    } );

  };

  window.rt = rt;

  return store => next => action => {

    if ( rtParams.debug && action.applySnapShots ) {
      applySnapShots( action.snapshots, store, action.matcherFn || rtParams.matcherFn );
    }

    let returnedValue, error;
    try {
      returnedValue = next( action );
    } catch ( e ) {
      error = e;
    }

    actions.push( Object.freeze( action ) );
    states.push( Object.freeze( store.getState() ) );
    errors.push( Object.freeze( error ) );

    if ( error ) throw error;
    return returnedValue;
  }
};

export {
  applySnapShots,
  createRT
};