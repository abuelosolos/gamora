import * as React from "react";
import type { SVGProps } from "react";
const SvgXLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 256 256"
    width="1em"
    height="1em"
    {...props}
  >
    <circle
      cx={128}
      cy={128}
      r={124}
      fill="#000"
      stroke="#2F3336"
      strokeWidth={8}
    />
    <path
      fill="#FFF"
      d="M142.26 117.62 193.83 58h-12.22l-44.78 51.76L101.07 58H59.82l54.08 78.34L59.82 198h12.22l47.29-54.66L157.11 198h41.25zm-16.74 19.35-5.48-7.8-43.58-62.04h18.77l35.19 50.11 5.48 7.8 45.74 65.11h-18.77z"
    />
  </svg>
);
export default SvgXLogo;
