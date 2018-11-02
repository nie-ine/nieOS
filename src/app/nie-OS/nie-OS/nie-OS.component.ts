

/**
 * Manual: How to add an app:
 * 1. Import the Component or Module in nie-OS.module.ts
 * 2. Add the app to the Model "openAppsInThisPage" in this file
 * 3. Add this app to the "Menu to open Apps" - div in nie-OS.component.html
 * 4. Add an app div by copying and pasting one of the existing divs and adjusting the input variables and the selector
 * */

import {AfterViewChecked, ChangeDetectorRef, Component, NgModule, OnInit, VERSION} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {Popup} from './popup';
import 'rxjs/add/operator/map';
import { ActivatedRoute } from '@angular/router';
import { ActionService } from '../../shared/nieOS/fake-backend/action/action.service';
import { PageService } from '../apps/page/page.service';
import {GenerateHashService} from "../../shared/nieOS/other/generateHash.service";
import {OpenAppsModel} from '../../shared/nieOS/mongodb/page/open-apps.model';
import {MongoPageService} from '../../shared/nieOS/mongodb/page/page.service';
import {MongoActionService} from '../../shared/nieOS/mongodb/action/action.service';

declare var grapesjs: any; // Important!


@Component({
  selector: 'nie-os',
  templateUrl: `nie-OS.component.html`,
})
export class NIEOSComponent implements OnInit, AfterViewChecked {
  image = {
    '@id' : 'https://www.e-manuscripta.ch/zuz/i3f/v20/1510612/canvas/1510618',
    '@type' : 'knora-api:StillImageFileValue',
    'knora-api:fileValueAsUrl' :
      'https://www.e-manuscripta.ch/zuz/i3f/v21/1510618/full/1304/0/default.jpg',
    'knora-api:fileValueHasFilename' : '1510618',
    'knora-api:fileValueIsPreview' : false,
    'knora-api:stillImageFileValueHasDimX' : 3062,
    'knora-api:stillImageFileValueHasDimY' : 4034,
    'knora-api:stillImageFileValueHasIIIFBaseUrl' : 'https://www.e-manuscripta.ch/zuz/i3f/v20'
  };
  projectIRI: string = 'http://rdfh.ch/projects/0001';
  actionID: number;
  length: number;
  page: any;
  action: any;
  panelsOpen = false;
  viewHashFromURL: string;
  openAppsInThisPage: any;

  constructor(
    private route: ActivatedRoute,
    private actionService: ActionService,
    private pageService: PageService,
    private cdr: ChangeDetectorRef,
    private generateHashService: GenerateHashService,
    private openApps: OpenAppsModel,
    private mongoPageService: MongoPageService,
    private mongoActionService: MongoActionService
  ) {
    this.route.params.subscribe(params => console.log(params));
  }

  ngAfterViewChecked() {
    this.cdr.detectChanges();
    if ( this.viewHashFromURL !==  this.route.snapshot.queryParams.view ) {
      this.openAppsInThisPage = this.openApps.openApps;
      this.page = {};
      this.actionID = this.route.snapshot.queryParams.actionID;
      this.viewHashFromURL = this.route.snapshot.queryParams.view;
      if ( this.viewHashFromURL ) {
        this.instantiateView( this.viewHashFromURL );
      } else {
        this.checkIfPageExistsForThisAction( this.actionID );
      }
    }
    this.cdr.detectChanges();
  }
  ngOnInit() {
    this.openAppsInThisPage = this.openApps.openApps;
    this.page = {};
    this.actionID = this.route.snapshot.queryParams.actionID;
    this.viewHashFromURL = this.route.snapshot.queryParams.view;
    if ( this.viewHashFromURL ) {
      this.instantiateView( this.viewHashFromURL );
    } else {
      this.checkIfPageExistsForThisAction( this.actionID );
    }
  }
  instantiateView( viewHash: string ) {
    console.log( 'ViewHash: ' + viewHash );
    this.updateAppsInView( viewHash );
    this.actionService.getById( this.actionID )
      .subscribe(
        data => {
          this.action = data;
        },
        error => {
          console.log(error);
          return undefined;
        });
  }
  checkIfPageExistsForThisAction(actionID: number ) {
    this.mongoActionService.getAction( actionID )
      .subscribe(
        data => {
          this.action = ( data as any ).action;
          console.log('This action: ');
          console.log(this.action);
          if ( this.action && this.action.hasPages[ 0 ] ) {
            this.updateAppsInView( this.action.hasPages[ 0 ] );
          } else {
            this.createEmptyPageInMongoDB();
            return undefined;
          }
        },
        error => {
          console.log(error);
          return undefined;
        });
  }
  createEmptyPageInMongoDB() {
    console.log('Hier weiter');
    this.mongoPageService.createPage()
      .subscribe( response => {
        console.log(response);
        this.page.hash = (response as any).page._id;
        this.action.hasPages.push(
          (response as any)
            .page
            ._id
        );
        console.log('Current action:');
        console.log(this.action);
        console.log('Next: Implement Update action in mongodb');
      },
      error => {
        console.log('Page could not be saved;');
        console.log(error);
      });
    console.log( this.page );
  }
  deletePage() {
    console.log('Delete page');
  }

  updateAppCoordinates(app: any) {
    console.log('x: ' + app.x);
    console.log('y: ' + app.y);
    console.log('type: ' + app.type);
    console.log('hash: ' + app.hash );
    if ( this.page[ app.hash ] === null ) {
      this.page[ app.hash ] = [];
    }
    this.page[ app.hash ] = app;
    console.log( this.page );
  }

  // Next: go through code and generalise app saving mechanism
  updateAppsInView( viewHash: string ) {
    // console.log('updateAppsInView');
    // console.log('get views from Backend');
    this.pageService.getById( viewHash )
      .subscribe(
        data => {
          this.page = data;
          console.log(this.page);
          for ( const app in this.page ) {
            for ( const appType in this.openAppsInThisPage ) {
              this.initiateUpdateApp(
                data[ app ],
                this.openAppsInThisPage[ appType ].type,
                this.openAppsInThisPage[ appType ].model
              );
            }
          }
        },
        error => {
          console.log(error);
        });
  }

  initiateUpdateApp(
    appFromViewModel: any,
    appType: string,
    appModel: any
  ) {
    if ( appFromViewModel.type === appType ) {
      this.updateApp(
        appType,
        appModel,
        appFromViewModel
      );
    }
  }

  updateApp(
    appType: string,
    appModel: any,
    appFromViewModel: any
  ) {
    const length = appModel.length;
    appModel[ length ] = {};
    appModel[ length ].x = appFromViewModel.x;
    appModel[ length ].y = appFromViewModel.y;
    appModel[ length ].hash = appFromViewModel.hash;
    appModel[ length ].type = appType;
    console.log(appModel);
  }

  createTooltip() {
    if ( this.action ) {
      return 'Aktion: ' + this.action.title + ', Beschreibung: ' + this.action.description;
    } else {
      return null;
    }
  }
  updatePage() {
    console.log('update page for this action');
    console.log(this.action);
    console.log(this.page);
    this.pageService.update( this.page )
      .subscribe(
        data => {
          console.log(data);
        },
        error => {
          console.log(error);
        });
  }

  savePage() {
    if ( this.action && this.action.hasPages[0] ) {
      this.updatePage();
    } else {
      this.createNewPage();
    }
  }

  createNewPage() {
    this.action.hasPages[ 0 ] = this.page.hash;
    this.actionService.update(this.action)
      .subscribe(
        data => {
          console.log(data);
        },
        error => {
          console.log(error);
        });
    // Save new view
    this.pageService.create( this.page )
      .subscribe(
        data => {
          console.log(data);
        },
        error => {
          console.log(error);
        });
  }
  addAnotherApp (
    appModel: any,
    generateHash: boolean
  ): Array<any> {
    console.log('add another app');
    const length = appModel.length;
    appModel[ length ] = {};
    console.log('Add type and Id here');
    if ( generateHash ) {
      appModel[ length ].hash = this.generateHashService.generateHash();
    }
    return appModel;
  }

  closeApp(
    appModel: Array<any>,
    i: number
  ) {
    console.log(appModel);
    console.log(this.page);
    console.log(this.page[appModel[ i ].hash]);
    delete this.page[appModel[ i ].hash];
    appModel.splice(
      i,
      1);
    console.log(this.page);
    console.log(this.openAppsInThisPage);
  }

  updateAppTypesFromDataChooser( openAppsInThisPageFromDataChooser: any ) {
    console.log( this.openAppsInThisPage );
    console.log( openAppsInThisPageFromDataChooser );
    this.openAppsInThisPage = openAppsInThisPageFromDataChooser;
    console.log('updateAppTypesFromDataChooser');
  }

  returnTextListArray( appInput: any ) {
    if ( appInput.inputs ) {
      return appInput.inputs[0].array;
    }
  }

  expandPanels() {
    this.panelsOpen = !this.panelsOpen;
  }

  initialiseBarchart(initialised: boolean) {
    console.log(initialised);
    initialised = true;
  }
}
