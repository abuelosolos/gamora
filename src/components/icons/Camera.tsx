import * as React from "react";
import type { SVGProps } from "react";
const SvgCamera = (props: SVGProps<SVGSVGElement>) => (
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
      d="M19.5 5.25h-2.599l-1.278-1.916A.75.75 0 0 0 15 3H9a.75.75 0 0 0-.623.334L7.097 5.25H4.5A2.25 2.25 0 0 0 2.25 7.5V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V7.5a2.25 2.25 0 0 0-2.25-2.25M20.25 18a.75.75 0 0 1-.75.75h-15a.75.75 0 0 1-.75-.75V7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 0 .624-.334L9.401 4.5h5.197l1.278 1.916a.75.75 0 0 0 .624.334h3a.75.75 0 0 1 .75.75zM12 8.25a4.125 4.125 0 1 0 0 8.25 4.125 4.125 0 0 0 0-8.25M12 15a2.625 2.625 0 1 1 0-5.25A2.625 2.625 0 0 1 12 15"
    />
  </svg>
);
export default SvgCamera;
