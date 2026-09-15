export type Token = "surface.default" | "surface.muted" | "action.primary";

type BaseComponent = {
  id: string;
  label: string;
  token: Token;
};

export type TextInput = BaseComponent & {
  type: "textInput";
  name: string;
  inputMode: "text" | "email" | "numeric";
  required?: boolean;
};

export type Select = BaseComponent & {
  type: "select";
  name: string;
  options: Array<{ label: string; value: string }>;
};

export type Button = BaseComponent & {
  type: "button";
  action: "submit" | "reset";
};

export type UiContract = {
  version: "1";
  screen: { title: string; description: string };
  components: Array<TextInput | Select | Button>;
};
