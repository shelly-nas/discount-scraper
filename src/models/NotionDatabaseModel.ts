import { RichText } from "./NotionBasicModel";

// Abstract base class for different property types
abstract class Properties {
  constructor(public type: string) {}
}

// Represents a Title property type in Notion
export class Title extends Properties {
  public title: RichText[];

  constructor(rich_text: RichText[]) {
    super("title");
    this.title = rich_text;
  }
}

// Represents a Number property type in Notion
export class Number extends Properties {
  public number: number;

  constructor(number: number) {
    super("number");
    this.number = number; 
  }
}

// Represents a Text property type in Notion
export class Text extends Properties {
  public rich_text: RichText[];

  constructor(rich_text: RichText[]) {
    super("rich_text");
    this.rich_text = rich_text;
  }
}

// Represents a Select property type in Notion
export class Select extends Properties {
  public select: { name: string };

  constructor(name: string) {
    super("select");
    this.select = { name };
  }
}

// Represents a Date property type in Notion
export class Date extends Properties {
  public date: { start: string };

  constructor(start: string) {
      super("date");
      this.date = { start };
  }
}