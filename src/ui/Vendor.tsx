import { useEffect, useRef } from "preact/hooks";
import { mountDialPad, type DialPadProps } from "../vendor/dialkit/dial-pad-control.ts";
import {
  mountEasingVisualization,
  type EasingVisualizationProps,
} from "../vendor/dialkit/easing-control.ts";
import { mountImageControl, type ImageControlProps } from "../vendor/dialkit/image-control.ts";

type Mounted<P> = { update: (props: P) => void; destroy: () => void };

// dialkit's controls are framework-free DOM widgets; this is the same thin
// wrapper its React adapter uses: mount once, push props on every render.
function useVendorControl<P>(mount: (host: HTMLElement, props: P) => Mounted<P>, props: P) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<Mounted<P> | null>(null);
  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    control.current = mount(host.current!, latest.current);
    return () => control.current?.destroy();
  }, []);
  useEffect(() => {
    control.current?.update(props);
  });
  return host;
}

export function ImageControl(props: ImageControlProps) {
  return <div ref={useVendorControl(mountImageControl, props)} class="dialkit-image-host" />;
}

export function DialPad(props: DialPadProps) {
  return <div ref={useVendorControl(mountDialPad, props)} class="dialkit-pad-host" />;
}

export function EasingEditor(props: EasingVisualizationProps) {
  return <div ref={useVendorControl(mountEasingVisualization, props)} class="dialkit-easing-host" />;
}
