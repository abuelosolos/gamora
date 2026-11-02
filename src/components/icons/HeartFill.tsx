import * as React from "react";
import type { SVGProps } from "react";
const SvgHeartFill = (props: SVGProps<SVGSVGElement>) => (
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
      d="M22.5 9.563c0 6.562-9.73 11.874-10.145 12.093a.75.75 0 0 1-.71 0C11.23 21.436 1.5 16.125 1.5 9.563A5.82 5.82 0 0 1 7.313 3.75c1.935 0 3.63.832 4.687 2.24 1.057-1.408 2.752-2.24 4.688-2.24A5.82 5.82 0 0 1 22.5 9.563"
    />
  </svg>
);
export default SvgHeartFill;
