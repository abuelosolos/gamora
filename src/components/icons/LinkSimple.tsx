import * as React from "react";
import type { SVGProps } from "react";
const SvgLinkSimple = (props: SVGProps<SVGSVGElement>) => (
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
      d="M15.53 8.47a.75.75 0 0 1 0 1.06l-6 6a.75.75 0 1 1-1.06-1.06l6-6a.75.75 0 0 1 1.06 0m4.682-4.682a5.25 5.25 0 0 0-7.424 0L9.968 6.605a.75.75 0 0 0 1.062 1.06l2.818-2.812a3.75 3.75 0 0 1 5.303 5.303l-2.819 2.818a.75.75 0 0 0 1.06 1.061l2.82-2.822a5.25 5.25 0 0 0 0-7.425M12.97 16.333l-2.818 2.818a3.75 3.75 0 1 1-5.302-5.303l2.817-2.817a.75.75 0 1 0-1.061-1.062l-2.817 2.819a5.25 5.25 0 0 0 7.425 7.424l2.818-2.819a.75.75 0 1 0-1.062-1.06"
    />
  </svg>
);
export default SvgLinkSimple;
