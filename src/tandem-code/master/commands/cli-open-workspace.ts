import path =  require("path");
import glob =  require("glob");
import { inject } from "@tandem/common";
import { TransformStream } from "@tandem/mesh";
import { URIProtocolProvider } from "@tandem/sandbox";
import { OpenNewWorkspaceRequest } from "tandem-code/common";
import {  BaseStudioMasterCommand } from "./base";


export class CLIOpenWorkspaceCommand extends  BaseStudioMasterCommand {

  
  async execute() {
    let uri = this.config.argv._[0];

    const protocol = uri && URIProtocolProvider.lookup(uri, this.injector);

    // scan the CWD for any tandem files
    if (uri != null && !(await protocol.fileExists(uri))) {

      uri = uri.replace(/^\./, process.cwd()).replace(/^~/, process.env.HOME);

      if (!(await protocol.fileExists(uri))) {
        uri = glob.sync(path.join(uri, `{${this.config.projectFileExtensions.map(ext => `*.${ext}`).join(",")}}`)).find((uri) => {
          return true;
        });
      }
    }

    // open new workspace anyways -- the user will be prompted to open a file from there
    if (!uri) {
      return this.bus.dispatch(new  OpenNewWorkspaceRequest(undefined));
    }
      
    if (uri.substr(0, 1) !== "/" && !/\w+:\/\//.test(uri)) {
      uri = path.join(process.cwd(), uri);
    }

    if (!(await protocol.fileExists(uri))) {
      this.logger.error(`Cannot open ${uri}: File does not exist.`);
      return;
    }

    return this.bus.dispatch(new OpenNewWorkspaceRequest(uri));
  }
} 

