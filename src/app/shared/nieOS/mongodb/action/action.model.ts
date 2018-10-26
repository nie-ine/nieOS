export interface Action {
  id: string;
  title: string;
  description: string;
  isFinished: boolean; // isInProgress, isFinished
  deleted: boolean;
  type: string;
  hasViews: Array<string>; // hashes of the views
  hasPageSet: string;
}

export interface ActionArray extends Array<Action> {}