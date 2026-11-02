import * as React from "react";
import type { SVGProps } from "react";
const SvgX = (props: SVGProps<SVGSVGElement>) => (
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
      d="M19.28 18.22a.75.75 0 0 1-1.06 1.06L12 13.06l-6.22 6.22a.75.75 0 0 1-1.06-1.06L10.94 12 4.72 5.78a.75.75 0 1 1 1.06-1.06L12 10.94l6.22-6.22a.75.75 0 1 1 1.06 1.06L13.06 12z"
    />
  </svg>
);
export default SvgX;
