import {Component, EventEmitter, Input, OnChanges, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-data-assignment',
  templateUrl: './data-assignment.component.html'
})
export class DataAssignmentComponent implements OnChanges {
  @Input() index: number;
  @Input() openAppsInThisPage: any;
  @Input() appInputQueryMapping: any;
  @Input() response: any;
  @Input() queryId;
  @Input() updateLinkedApps = false;
  @Input() indexAppMapping: any;
  @Output() sendAppTypesBackToNIEOS: EventEmitter<any> = new EventEmitter<any>();
  arrayIndicator: Array<any> = [];
  constructor() { }

  ngOnChanges() {
    if ( this.updateLinkedApps ) {
      this.updateLinkedAppsMethod();
    }
    this.goThroughAppInputs();
  }

  /**
   * This method assigns data chosen by the data chooser. If parts of the json are arrays,
   * this method assigns the depth = 0 to array coming after the first array where the depth is chosen by the
   * data chooser
   * */
  goThroughAppInputs() {
    for ( const type in this.openAppsInThisPage ) {
      if (  this.openAppsInThisPage[ type ].model.length && type !== 'dataChooser' ) {
        for ( const app of this.openAppsInThisPage[ type ].model ) {
          if ( this.appInputQueryMapping[ app.hash ] ) {
            for ( const input in this.appInputQueryMapping[ app.hash ] ) {
              if ( this.appInputQueryMapping[ app.hash ][ input ][ 'query' ] === this.queryId ) {
                let increment = 0;
                for ( const segment of this.appInputQueryMapping[ app.hash ][ input ][ 'path' ] ) {
                  if ( segment === null ) {
                    this.appInputQueryMapping[ app.hash ][ input ][ 'path' ].splice( increment, 1 );
                  }
                  increment += 1;
                }
                app[ input ] = this.generateAppinput(
                  this.response,
                  this.appInputQueryMapping[ app.hash ][ input ][ 'path' ],
                  this.index,
                  0,
                  true,
                  app
                );
              }
            }
          }
        }
      }
    }
    this.sendAppTypesBackToNIEOS.emit( this.openAppsInThisPage );
  }

  generateAppinput(
    response: any,
    path: any,
    index: number,
    depth: number,
    firstArray: boolean,
    app: any
  ) {
    // console.log( depth, path.length );
    if ( response ) {
        if ( path.length === 1 ) {
          return response[ path[ 0 ] ];
        } else if ( response.length  ) {                                          // Response is an array
          if ( typeof response === 'string' ) {
            return response;
          } else {
            if ( firstArray ) {
              return this.generateAppinput(
                response[ index ],
                path,
                index,
                depth + 1,
                false,
                app
              );
            } else {
              return this.generateArrayInput(
                response,
                path,
                index,
                depth,
                false,
                app
              );
            }
          }
        } else if ( depth !== path.length && response[ path[ depth ] ] ) {        // Response is not an array
          return this.generateAppinput(
            response[ path[ depth ] ],
            path,
            index,
            depth + 1,
            firstArray,
            app
          );
        } else if ( depth === path.length ) {
          // console.log( response );
          return response[ path[ depth - 1 ] ];
        } else if ( path.length - 1 === depth &&  Number( path[ depth ] ) ) {
          return response[ path[ depth - 1 ] ][ Number( path[ depth ] ) ];
        } else {
          return this.generateAppinput(
            response[ path[ depth - 1 ] ],
            path, index,
            depth + 1,
            firstArray,
            app
          );
      }
    }
  }

  generateArrayInput(
    response: any,
    path: any,
    index: number,
    depth: number,
    firstArray: boolean,
    app: any
  ) {
    app.index = 0;
    app.arrayLength = response.length;
    app.queryId  = this.queryId;
    // console.log( 'Generate Array Input', app );
    return this.generateAppinput(
      response[ app.index ],
      path,
      app.index,
      depth,
      true,
      app
    );
  }

  updateLinkedAppsMethod() {
    console.log(
      'Update Linked Apps Method',
      this.indexAppMapping,
      this.openAppsInThisPage
    );
    for (const appHash in this.indexAppMapping) {
      for (const type in this.openAppsInThisPage) {
        if (this.openAppsInThisPage[type].model.length && type !== 'dataChooser') {
          for (const app of this.openAppsInThisPage[type].model) {
            if (this.appInputQueryMapping[app.hash] && appHash === app.hash) {
              for (const input in this.appInputQueryMapping[app.hash]) {
                this.arrayIndicator[this.appInputQueryMapping[app.hash][input]['query']] = [];
                if (this.appInputQueryMapping[app.hash][input]['query'] === this.indexAppMapping[appHash].queryId) {
                  this.updatePath(
                    this.appInputQueryMapping[app.hash][input]['path'],
                    this.indexAppMapping[appHash].index,
                    this.response,
                    this.appInputQueryMapping[app.hash][input]['query']
                  );
                }
                this.findLastArrayIndexAndreplaceItWithIndex(
                  this.indexAppMapping[ appHash ].index,
                  this.appInputQueryMapping[app.hash][input]['query']
                );
              }
            }
          }
        }
      }
    }
  }

  findLastArrayIndexAndreplaceItWithIndex(index: number, query: string) {
    for ( let i = this.arrayIndicator[query].length - 1; i >= 0; i-- ) {
      if ( !isNaN ( Number( this.arrayIndicator[query][ i ] ) ) ) {
        this.arrayIndicator[query][ i ] = index;
        i = -1;
      }
    }
    this.updateAppInputWithNewPath();
  }

  updateAppInputWithNewPath() {
    console.log( 'Hier weiter' );
    console.log( this.arrayIndicator );
  }

  updatePath(
    path: Array<any>,
    index: number,
    response,
    queryId: string
  ) {
    // console.log(
    //   'Update Path',
    //   path,
    //   index,
    //   // response,
    //   this.arrayIndicator
    // );
    /**
     * Find last array in this path and update it with index!
     * */
    if( response && typeof response !== 'string') {
      if ( response[ path[ 0 ] ] ) {
        const segment = path[ 0 ];
        path.splice( 0, 1 );
        this.arrayIndicator[ queryId ].push(segment);
        this.updatePath(
          path,
          index,
          response[ segment ],
          queryId
        );
      } else {
        this.arrayIndicator[ queryId ].push(0);
        this.updatePath(
          path,
          index,
          response[ 0 ],
          queryId
        );
      }
    }
  }
}
