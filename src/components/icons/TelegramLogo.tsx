import * as React from "react";
import type { SVGProps } from "react";
const SvgTelegramLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 256 256"
    width="1em"
    height="1em"
    {...props}
  >
    <circle cx={128} cy={128} r={128} fill="#26A5E4" />
    <path
      fill="#FFF"
      d="M189.64 74.19 54.51 126.3c-9.22 3.7-9.17 8.84-1.68 11.14l34.69 10.82 80.26-50.65c3.8-2.31 7.27-1.07 4.41 1.46l-65.03 58.69-2.4 35.81c3.52 0 5.07-1.61 7.04-3.52l16.91-16.44 35.17 25.98c6.48 3.58 11.14 1.74 12.75-6.01L199.7 84.85c2.36-9.47-3.61-13.76-10.06-10.66"
    />
  </svg>
);
export default SvgTelegramLogo;
