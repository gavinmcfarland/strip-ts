import React from "react";
const Button = ({ children, href, target, style, onClick }) => {
  const buttonStyle = {
    display: "block",
    borderRadius: "5px",
    border: "1px solid var(--figma-color-border)",
    padding: "0 7px",
    lineHeight: "22px",
    textDecoration: "none",
    color: "var(--figma-color-text)",
    ...style
    // Merge with any passed styles
  };
  if (href) {
    return /* @__PURE__ */ React.createElement("a", { href, target, style: buttonStyle, onClick }, children);
  }
  return /* @__PURE__ */ React.createElement("button", { style: buttonStyle, onClick }, children);
};
export default Button;
