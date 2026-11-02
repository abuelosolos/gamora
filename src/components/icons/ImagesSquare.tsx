import * as React from "react";
import type { SVGProps } from "react";
const SvgImagesSquare = (props: SVGProps<SVGSVGElement>) => (
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
      d="M19.5 3h-12A1.5 1.5 0 0 0 6 4.5V6H4.5A1.5 1.5 0 0 0 3 7.5v12A1.5 1.5 0 0 0 4.5 21h12a1.5 1.5 0 0 0 1.5-1.5V18h1.5a1.5 1.5 0 0 0 1.5-1.5v-12A1.5 1.5 0 0 0 19.5 3m-12 1.5h12v6.504L17.934 9.44a1.5 1.5 0 0 0-2.12 0L8.754 16.5H7.5zm9 15h-12v-12H6v9A1.5 1.5 0 0 0 7.5 18h9zm3-3h-8.625l6-6 2.625 2.625zm-8.25-6a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5m0-3a.75.75 0 1 1 0 1.5.75.75 0 0 1 0-1.5"
    />
  </svg>
);
export default SvgImagesSquare;
