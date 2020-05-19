/**
 * This component is the material dialog when clicking on page data manager icon
 * on the page.
 * The gui that is generated by this component enables the user to add queries to an
 * existing page and map inputs to a query
 * */

import {Component, Inject, OnInit, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material';
import { MatTable } from '@angular/material';
import { QueryEntryComponent } from '../../../query-engine/query-entry/query-entry.component';
import { QueryAppInputMapComponent } from '../../query-app-input-map/query-app-input-map.component';
import {PageService} from '../../../user-action-engine/mongodb/page/page.service';
import {ActivatedRoute} from '@angular/router';
import {ActionService} from '../../../user-action-engine/mongodb/action/action.service';
import {OpenAppsModel} from '../../../user-action-engine/mongodb/page/open-apps.model';
import {NgxSpinnerService} from 'ngx-spinner';
import { QueryListComponent } from '../../../query-engine/query-list/query-list.component';
import { QueryService } from '../../../user-action-engine/mongodb/query/query.service';

@Component({
  selector: 'app-data-management',
  templateUrl: './data-management.component.html',
  styleUrls: ['./data-management.component.scss']
})
export class DataManagementComponent {

  /**
   * The table displays the mapping between the queries and the
   * apps.
   * */
  @ViewChild(MatTable) table: MatTable<any>;

  /**
   * This is the actionId of the current action that is the root of a page / pageSet
   * */
  actionID: string;

  /**
   * true until the page - data mgmt component has loaded all queries etc.
   * */
  isLoading: boolean;

  /**
   * This array and the following string belongs to the angular material table
   * */
  displayedColumns = ['query'];
  columnsToDisplay: string[] = this.displayedColumns.slice();

  /**
   * This variable is used in the html template of this component,
   * as an iterater
   * */
  value: string;

  /**
   * Array that belongs to angular material table
   * */
  openApps: Array<any> = [];

  /**
   * this variable contains the mapping between the input of an app to a part of a json response of a query
   * */
  appInputQueryMapping = [];

  /**
   * This variable contains the queries as a raw response from mongodb
   * */
  queries = [];

  /**
   * This variable contains the openApps on the current page
   * */
  openAppsInThisPage: any;

  /**
   * Information about the current page
   * */
  page: any;

  /**
   * Information about the current action
   * */
  action: any;

  /**
   * This boolean prevents this component from reloading the same content more than once.
   * */
  reloadVariables = false;

  constructor(
    public dialogRef: MatDialogRef<DataManagementComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialog: MatDialog,
    private actionService: ActionService,
    private pageService: PageService,
    private queryService: QueryService,
    private route: ActivatedRoute,
    private appModel: OpenAppsModel,
    private spinner1: NgxSpinnerService
  ) {
    const openAppArray: Array<any> = data[ 2 ];
    console.log( data );
    // console.log( data );
    if (this.table) {
      this.resetTable();
    }
    let i = 0;
    this.page = data[ 1 ];
    this.appInputQueryMapping = this.page.appInputQueryMapping;
    this.queryService.getAllQueriesOfPage(this.page._id)
      .subscribe((queryResponse) => {
        this.queries = queryResponse.queries.slice().reverse();
      });
    for (const app of openAppArray) {
        if( this.appModel.openApps[ app.type ] && this.appModel.openApps[ app.type ].inputs ) {
          app.inputs =  this.appModel.openApps[ app.type ].inputs;
          this.openApps.push(app);
          /*            for (const query in this.queries) {
                        this.queries[query][appOfSameType.hash] = appOfSameType.hash;
                      }*/
          this.columnsToDisplay.push(app.hash);
        }
      if ( i === openAppArray.length - 1 ) {
        if (this.table) {
          this.table.renderRows();
        }
      }
      i += 1;
    }
  }

  resetTable() {
    this.columnsToDisplay = this.displayedColumns.slice();
    this.displayedColumns = ['query'];
    this.openApps = [];
    this.table.renderRows();
  }

  checkIfPathIsDefined( appHash: string ) {
    for ( const input in this.appInputQueryMapping[appHash] ) {
      if ( this.appInputQueryMapping[appHash][ input ][ 'path' ] ) {
        return true;
      }
    }
  }

  delete(row: any): void {
    const index = this.queries.indexOf(row, 0);
    if (index > -1) {
      this.queryService.deleteQueryOfPage(this.page._id, row._id)
          .subscribe((data) => {
              if (data.status === 200) {
                this.queries.splice(index, 1);
                this.table.renderRows();
              } else {
                // Fehlermeldung dass query nicht gelöscht werden konnte
              }
          });
    }
  }

  addQuery(name: string) {
    this.queryService.createQueryOfPage(this.page._id, {title: name})
        .subscribe(data => {
          if (data.status === 201) {
              this.queries.push(data.body.query);
              this.table.renderRows();
          }
        });
  }

  openExistingQueryDialog() {
    const dialogRef = this.dialog.open(QueryListComponent, {
      width: '100%',
      height: '100%',
      data: {
        enableAdd: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.queryService.createQueryOfPage(this.page._id, {
          title: `${result.title}_Copy`,
          description: result.description,
          serverUrl: result.serverUrl,
          method: result.method,
          params: result.params,
          header: result.header,
          body: result.body,
          path: result.path
        })
          .subscribe(data => {
            if (data.status === 201) {
              this.queries.push(data.body.query);
              this.table.renderRows();
            }
          });
      }
    });
  }

  close( ) {
      this.dialogRef.close();
  }

  showThisQueryMapping( query: any ) {
    query.display = true;
    console.log( query );
    for ( const app in this.appInputQueryMapping ) {
      for ( const input in this.appInputQueryMapping[app] ) {
          if (
            query._id === this.appInputQueryMapping[app][input][ 'query' ] &&
            this.appInputQueryMapping[app][input][ 'path' ] ) {
            if ( !query.paths ) {
              query.paths = [];
            }
            query.paths.push( this.appInputQueryMapping[app][input][ 'path' ] );
          }
      }
    }
  }

  openQueryEntry(query: any) {
    const dialogRef = this.dialog.open(QueryEntryComponent, {
      width: '100%',
      height: '100%',
      data: {
        query: query,
        pageID: this.page._id
      }
    });
    dialogRef.afterClosed().subscribe((result) => {
      console.log('Abstract tree from query entry');
      console.log(result);
    });
  }

  assignInputToQuery(input: string, app: string, queryId: string, query: any) {
    if (!this.appInputQueryMapping[app]) {
      this.appInputQueryMapping[app] = {};
    }
    if (!this.appInputQueryMapping[app][input]) {
      this.appInputQueryMapping[app][input] = {};
    }
    this.appInputQueryMapping[app][input][ 'query' ] = queryId;
    console.log(this.appInputQueryMapping);
    if ( !query.paths ) {
      query.paths = [];
    }
    query.paths.push( this.appInputQueryMapping[app][input][ 'path' ] );
  }

  checkIfChosen(input: string, app: string, query: string) {
    if (
      this.appInputQueryMapping[app] &&
      this.appInputQueryMapping[app][input] &&
      this.appInputQueryMapping[app][input][ 'query' ] === query) {
      return true;
    } else {
      return false;
    }
  }

  checkIfRowIsChosen(app: string, query: string) {
    for (const input in this.appInputQueryMapping[app]) {
      if (this.appInputQueryMapping[app][input][ 'query' ] === query) {
        return true;
      }
    }
  }

  unSelectChip( input: string, app: string, query: string ) {
    this.appInputQueryMapping[app][input][ 'query' ] = undefined;
  }

  openQueryAppInputMapDialog( app: string, query: any ) {
    console.log( 'openQueryAppInputMapDialog' );
    const dialogRef = this.dialog.open(QueryAppInputMapComponent, {
      width: '100%',
      height: '100%',
      data: {
        mapping: this.appInputQueryMapping,
        app: app,
        query: query,
        openApps: this.openAppsInThisPage,
        abstractResponse: query.abstractResponse,
        page: this.page
      }
    });
    dialogRef.afterClosed().subscribe((result) => {
      this.reloadVariables = true;
    });
  }

  assignQueryToPath( path: any, query: any ) {
    query.chosenPath = path;
    this.queryService.updateQueryOfPage(this.page._id, query._id, query)
      .subscribe((data) => {
        if (data.status === 200) {
          console.log( 'query update successfull' );
        } else {
          console.log('Updating query failed');
        }
      });
  }

  generateCurrentPath( item ) {
    if ( item.path ) {
      let concatenatedPath = '';
      for ( const segment of item.path ) {
        concatenatedPath += ' ' + segment;
      }
      return concatenatedPath;
    } else {
      return '⛔⛔⛔ Please choose a path!';
    }
  }
}
