export interface Message {
  id: string;
  sender: "user" | "ai";
  text: string;
}

export interface Category {
  id: string;
  name: string;
}
