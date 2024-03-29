/* eslint-disable */
export interface AzureDevOpsTaskDef {
  id?: string;
  name?: string;
  friendlyName?: string;
  description?: string;
  helpUrl?: string;
  helpMarkDown?: string;
  author?: string;
  preview?: boolean;
  deprecated?: boolean;
  removalDate?: string;
  showEnvironmentVariables?: boolean;
  runsOn?: ("Agent" | "MachineGroup" | "Server" | "ServerGate" | "DeploymentGroup")[];
  visibility?: ("Build" | "Release")[];
  category?:
    | "Build"
    | "Utility"
    | "Test"
    | "Package"
    | "Deploy"
    | "Azure Repos"
    | "Azure Boards"
    | "Azure Pipelines"
    | "Azure Test Plans"
    | "Azure Artifacts";
  groups?: {
    name: string;
    displayName: string;
    isExpanded?: boolean;
    visibleRule?: string;
  }[];
  demands?: string[];
  minimumAgentVersion?: string;
  version?: {
    Major: number;
    Minor: number;
    Patch: number;
  };
  instanceNameFormat?: string;
  releaseNotes?: string;
  inputs?: {
    name: string;
    aliases?: string[];
    label: string;
    type: (
      | (
          | "boolean"
          | "filePath"
          | "multiLine"
          | "pickList"
          | "radio"
          | "secureFile"
          | "string"
          | "int"
          | "identities"
          | "querycontrol"
        )
      | string
    ) &
      string;
    defaultValue?: string | boolean;
    required?: boolean;
    helpMarkDown?: string;
    groupName?: string;
    visibleRule?: string;
    properties?: {
      EditableOptions?: "True" | "False";
      MultiSelect?: "True" | "False";
      MultiSelectFlatList?: "True" | "False";
      DisableManageLink?: "True" | "False";
      IsSearchable?: "True" | "False";
      PopulateDefaultValue?: "True" | "False";
      isVariableOrNonNegativeNumber?: "true" | "false";
      resizable?: boolean;
      rows?: string;
      maxLength?: string;
      editorExtension?: string;
      EndpointFilterRule?: string;
      [k: string]: unknown;
    };
    options?: {
      [k: string]: unknown;
    };
  }[];
  dataSourceBindings?: {
    target?: string;
    endpointId?: string;
    dataSourceName?: string;
    parameters?: {
      [k: string]: unknown;
    };
    resultTemplate?: string;
    endpointUrl?: string;
    resultSelector?: string;
    RequestVerb?: "GET" | "POST" | "DELETE" | "OPTIONS" | "HEAD" | "PUT" | "TRACE" | "PATCH";
    requestContent?: string;
    callbackContextTemplate?: string;
    callbackRequiredTemplate?: string;
    initialContextTemplate?: string;
  }[];
  sourceDefinitions?: {
    target?: string;
    endpoint?: string;
    selector?: string;
    keySelector?: string;
    authKey?: string;
  }[];
  prejobexecution?: {
    Node16?: ExecutionObject;
    Node10?: ExecutionObject;
    Node?: ExecutionObject;
    PowerShell3?: ExecutionObject;
    PowerShell?: ExecutionObject;
  };
  execution?: {
    Node16?: ExecutionObject;
    Node10?: ExecutionObject;
    Node?: ExecutionObject;
    PowerShell3?: ExecutionObject;
    PowerShell?: ExecutionObject;
  };
  postjobexecution?: {
    Node16?: ExecutionObject;
    Node10?: ExecutionObject;
    Node?: ExecutionObject;
    PowerShell3?: ExecutionObject;
    PowerShell?: ExecutionObject;
  };
  messages?: {
    [k: string]: unknown;
  };
  outputVariables?: {
    name: string;
    description?: string;
  }[];
  restrictions?: {
    commands?: {
      mode?: "any" | "restricted";
    };
    settableVariables?: {
      allowed?: string[];
    };
  };
  $schema?: string;
}
export interface ExecutionObject {
  target: string;
  platforms?: "windows"[];
  argumentFormat?: string;
  workingDirectory?: string;
  [k: string]: unknown;
}