import * as React from "react";
import type { SVGProps } from "react";
const SvgGoogleOutlined = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="1em"
    height="1em"
    fill="none"
    viewBox="0 0 24 24"
    {...props}
  >
    <g
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      clipPath="url(#google-outlined_svg__a)"
    >
      <path d="M19.33 20.15c2.032-1.876 3.205-4.632 3.205-7.906 0-.762-.068-1.495-.195-2.198H12.215v4.163H18a4.96 4.96 0 0 1-2.16 3.234M2.618 16.828c1.769 3.508 5.395 5.922 9.597 5.922 2.903 0 5.336-.958 7.115-2.6l-3.49-2.707c-.957.645-2.179 1.036-3.625 1.036-2.795 0-5.17-1.886-6.02-4.427M2.618 7.182A10.6 10.6 0 0 0 1.465 12c0 1.74.42 3.372 1.153 4.818l2.785-2.17.792-.605A6.4 6.4 0 0 1 5.853 12c0-.713.127-1.398.342-2.042M12.215 5.53c1.583 0 2.99.548 4.114 1.603l3.079-3.078c-1.867-1.74-4.29-2.805-7.193-2.805-4.202 0-7.828 2.414-9.597 5.932l3.577 2.776c.85-2.541 3.225-4.428 6.02-4.428" />
    </g>
    <defs>
      <clipPath id="google-outlined_svg__a">
        <path fill="#fff" d="M0 0h24v24H0z" />
      </clipPath>
    </defs>
  </svg>
);
export default SvgGoogleOutlined;
