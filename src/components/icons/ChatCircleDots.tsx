import * as React from "react";
import type { SVGProps } from "react";
const SvgChatCircleDots = (props: SVGProps<SVGSVGElement>) => (
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
      d="M13.125 12a1.125 1.125 0 1 1-2.25 0 1.125 1.125 0 0 1 2.25 0m-5.25-1.125a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25m8.25 0a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25M21.75 12a9.75 9.75 0 0 1-14.332 8.608l-3.193 1.064a1.5 1.5 0 0 1-1.897-1.897l1.064-3.192A9.75 9.75 0 1 1 21.75 12m-1.5 0a8.25 8.25 0 1 0-15.393 4.13.75.75 0 0 1 .062.614L3.75 20.25l3.506-1.169a.73.73 0 0 1 .612.062A8.25 8.25 0 0 0 20.25 12"
    />
  </svg>
);
export default SvgChatCircleDots;
