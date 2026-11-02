import * as React from "react";
import type { SVGProps } from "react";
const SvgArchive = (props: SVGProps<SVGSVGElement>) => (
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
      d="M21 4.5H3A1.5 1.5 0 0 0 1.5 6v2.25A1.5 1.5 0 0 0 3 9.75V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18V9.75a1.5 1.5 0 0 0 1.5-1.5V6A1.5 1.5 0 0 0 21 4.5M19.5 18h-15V9.75h15zM21 8.25H3V6h18zm-12 4.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 1 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75"
    />
  </svg>
);
export default SvgArchive;
