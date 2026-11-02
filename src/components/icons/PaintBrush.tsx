import * as React from "react";
import type { SVGProps } from "react";
const SvgPaintBrush = (props: SVGProps<SVGSVGElement>) => (
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
      d="M21.75 3a.75.75 0 0 0-.75-.75c-4.132 0-8.373 4.66-10.728 7.747A5.625 5.625 0 0 0 3 15.375c0 2.895-1.832 4.193-1.919 4.253A.75.75 0 0 0 1.501 21h7.124a5.625 5.625 0 0 0 5.379-7.272C17.09 11.373 21.75 7.133 21.75 3M8.625 19.5H3.247c.632-.9 1.253-2.258 1.253-4.125A4.125 4.125 0 1 1 8.625 19.5m3.04-8.855q.48-.624.945-1.176a7.2 7.2 0 0 1 1.921 1.92q-.552.465-1.176.947a5.7 5.7 0 0 0-1.69-1.69m4.003-.25a8.7 8.7 0 0 0-2.063-2.063c2.98-3.238 5.227-4.22 6.553-4.492-.267 1.328-1.253 3.575-4.49 6.554"
    />
  </svg>
);
export default SvgPaintBrush;
