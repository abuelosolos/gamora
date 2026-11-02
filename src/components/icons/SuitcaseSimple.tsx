import * as React from "react";
import type { SVGProps } from "react";
const SvgSuitcaseSimple = (props: SVGProps<SVGSVGElement>) => (
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
      d="M20.25 5.25H16.5V4.5a2.25 2.25 0 0 0-2.25-2.25h-4.5A2.25 2.25 0 0 0 7.5 4.5v.75H3.75a1.5 1.5 0 0 0-1.5 1.5v12a1.5 1.5 0 0 0 1.5 1.5h16.5a1.5 1.5 0 0 0 1.5-1.5v-12a1.5 1.5 0 0 0-1.5-1.5M9 4.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 .75.75v.75H9zm11.25 2.25v6.75H3.75V6.75zm0 12H3.75V15h16.5z"
    />
  </svg>
);
export default SvgSuitcaseSimple;
