import * as React from "react";
import type { SVGProps } from "react";
const SvgEraser = (props: SVGProps<SVGSVGElement>) => (
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
      d="m21.094 7.538-3.882-3.882a2.25 2.25 0 0 0-3.181 0L2.906 14.781a2.25 2.25 0 0 0 0 3.181l2.818 2.819a.75.75 0 0 0 .533.219H20.25a.75.75 0 0 0 0-1.5h-7.94l8.784-8.78a2.25 2.25 0 0 0 0-3.182M10.189 19.5H6.567l-2.599-2.599a.75.75 0 0 1 0-1.06L9 10.811l4.94 4.939zm9.843-9.844L15 14.69l-4.94-4.94 5.034-5.03a.75.75 0 0 1 1.061 0l3.88 3.879a.75.75 0 0 1 0 1.06z"
    />
  </svg>
);
export default SvgEraser;
