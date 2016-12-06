import React =  require("React");
import { ApplyFileEditRequest } from "@tandem/sandbox";
import { BaseApplicationComponent } from "@tandem/common";
import { SyntheticTDArtboardElement } from "@tandem/tdproject-extension/synthetic"; 
import { TextInputComponent } from "@tandem/uikit";

export class InjectComponent extends  BaseApplicationComponent<{ artboard: SyntheticTDArtboardElement }, any> {

  onChange = (newValue: any) => {
    const edit = this.props.artboard.createEdit();
    edit.setAttribute("inject-script", encodeURIComponent(newValue));
    this.bus.dispatch(new ApplyFileEditRequest(edit.mutations));
  }
  
  render() {
    const { artboard } = this.props;

    let inject = artboard.getAttribute("inject-script");
    if (inject) inject = decodeURIComponent(inject);

    
    return <div className="pane">
      <div className="header">
        Script
      </div>
      <div className="container">
        <div className="row">
          <div className="col-12">
            <TextInputComponent rows={6} placeholder={`var global = "Hola";`} value={inject} onChange={this.onChange} />
          </div>
        </div>
      </div>
    </div>
  }
}