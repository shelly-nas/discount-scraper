// Class models for Database Entries
abstract class Properties {
  constructor(public type: string) { }  // Base class only needs a type
}

export class Title extends Properties {
  public title: RichText[];

  constructor(rich_text: RichText[]) {
      super("title");
      this.title = rich_text;
  }
}

export class Number extends Properties {
  public number: number;

  constructor(number: number) {
      super("number");
      this.number = number;
  }
}

export class Text extends Properties {
  public rich_text: RichText[];

  constructor(rich_text: RichText[]) {
      super("rich_text");
      this.rich_text = rich_text;
  }
}

export class Select extends Properties {
  public select: { name: string };

  constructor(name: string) {
      super("select");
      this.select = { name };
  }
}

// Class models for Page Blocks
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

export class Divider extends Block {
  public divider: {};

  constructor() {
    super("divider");
    this.divider = {};
  }
}

// Class models for general use
export class RichText {
  public type: string = "text";
  public text: Content;

  constructor(content: string) {
    this.text = new Content(content);
  }
}

class Content {
  constructor(public content: string) {  }
}
