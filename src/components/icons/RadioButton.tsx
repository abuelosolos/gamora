import * as React from "react";
import type { SVGProps } from "react";
const SvgRadioButton = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <path
      fill="currentColor"
      d="M12 2.25A9.75 9.75 0 1 0 21.75 12 9.76 9.76 0 0 0 12 2.25m0 18A8.25 8.25 0 1 1 20.25 12 8.26 8.26 0 0 1 12 20.25m0-13.5a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5m0 9a3.75 3.75 0 1 1 0-7.5 3.75 3.75 0 0 1 0 7.5"
    />
  </svg>
);
export default SvgRadioButton;
