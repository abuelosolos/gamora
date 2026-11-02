import * as React from "react";
import type { SVGProps } from "react";
const SvgPencilSimpleLine = (props: SVGProps<SVGSVGElement>) => (
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
      d="m21.311 6.878-4.19-4.188a1.5 1.5 0 0 0-2.121 0L3.44 14.25A1.49 1.49 0 0 0 3 15.31v4.19A1.5 1.5 0 0 0 4.5 21h15.75a.75.75 0 1 0 0-1.5h-9.439L21.311 9a1.5 1.5 0 0 0 0-2.122M8.69 19.5H4.5v-4.19l8.25-8.25 4.19 4.19zM18 10.19 13.811 6l2.25-2.25 4.189 4.19z"
    />
  </svg>
);
export default SvgPencilSimpleLine;
