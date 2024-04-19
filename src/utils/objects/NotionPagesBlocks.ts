class Block {
  public object: string = "block";
  public type: string;

  constructor(type: string) {
    this.type = type;
  }
}

export class Heading3 extends Block {
  public heading_3: { rich_text: RichText[] };

  constructor(rich_text: RichText[]) {
    super("heading_3");
    this.heading_3 = { rich_text };
  }
}

export class Todo extends Block {
  public to_do: { rich_text: RichText[] };

  constructor(rich_text: RichText[]) {
    super("to_do");
    this.to_do = { rich_text };
  }
}

export class RichText {
  public type: string = "text";
  public text: Content;

  constructor(content: string) {
    this.text = new Content(content);
  }
}

export class Divider extends Block {
  public divider: {};

  constructor() {
    super("divider");
    this.divider = {};
  }
}

class Content {
  public content: string;

  constructor(content: string) {
    this.content = content;
  }
}
