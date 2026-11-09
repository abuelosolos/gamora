import * as React from "react";
import type { SVGProps } from "react";
const SvgEnvelopeSimple = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 256 256"
    width="1em"
    height="1em"
    {...props}
  >
    <circle cx={128} cy={128} r={128} fill="#0A84FF" />
    <path
      fill="#FFF"
      d="M68 80h120a12 12 0 0 1 12 12v72a12 12 0 0 1-12 12H68a12 12 0 0 1-12-12V92a12 12 0 0 1 12-12m0 16v4.62l60 42 60-42V96l-60 42z"
    />
  </svg>
);
export default SvgEnvelopeSimple;
