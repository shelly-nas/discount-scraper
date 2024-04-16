interface IRichText {
    type: string;
    text: IContent;
}

interface IContent {
    content: string;
}

interface IBlock {
    object: string;
    type: string;
}

interface IHeading3 extends IBlock {
    heading_3: { rich_text: IRichText[] };
}

interface ITodo extends IBlock {
    to_do: { rich_text: IRichText[] };
}

interface IDivider extends IBlock {
    divider: {};
}