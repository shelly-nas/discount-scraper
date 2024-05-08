// Represents the content of a RichText object in Notion
class Content {
    constructor(public content: string) {}
  }
  
// Represents a RichText object in Notion
export class RichText {
public type: string = "text";
public text: Content;

constructor(content: string) {
    this.text = new Content(content);
}
}