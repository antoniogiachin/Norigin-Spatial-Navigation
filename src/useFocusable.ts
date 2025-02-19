import {
  RefObject,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState
} from 'react';
import noop from 'lodash/noop';
import uniqueId from 'lodash/uniqueId';
import {
  SpatialNavigation,
  FocusableComponentLayout,
  FocusDetails,
  KeyPressDetails,
  Direction
} from './SpatialNavigation';
import { useFocusContext } from './useFocusContext';

export type EnterPressHandler<P = object> = (
  props: P,
  details: KeyPressDetails
) => void;

export type EnterReleaseHandler<P = object> = (props: P) => void;

export type ArrowPressHandler<P = object> = (
  direction: string,
  props: P,
  details: KeyPressDetails
) => boolean;
  
export type BackPressHandler<P = object> = (
  props: P,
  details: KeyPressDetails
) => void;

export type FocusHandler<P = object> = (
  layout: FocusableComponentLayout,
  props: P,
  details: FocusDetails
) => void;

export type BlurHandler<P = object> = (
  layout: FocusableComponentLayout,
  props: P,
  details: FocusDetails
) => void;

export interface UseFocusableConfig<P = object> {
  focusable?: boolean;
  saveLastFocusedChild?: boolean;
  trackChildren?: boolean;
  autoRestoreFocus?: boolean;
  forceFocus?: boolean;
  isFocusBoundary?: boolean;
  focusBoundaryDirections?: Direction[];
  focusKey?: string;
  preferredChildFocusKey?: string;
  onEnterPress?: EnterPressHandler<P>;
  onEnterRelease?: EnterReleaseHandler<P>;
  onArrowPress?: ArrowPressHandler<P>;
  onBackPress?: EnterPressHandler<P>;
  onFocus?: FocusHandler<P>;
  onBlur?: BlurHandler<P>;
  extraProps?: P;
}

export interface UseFocusableResult {
  ref: RefObject<any>; // <any> since we don't know which HTML tag is passed here
  focusSelf: (focusDetails?: FocusDetails) => void;
  focused: boolean;
  hasFocusedChild: boolean;
  focusKey: string;
}

const useFocusableHook = <P>({
  focusable = true,
  saveLastFocusedChild = true,
  trackChildren = false,
  autoRestoreFocus = true,
  forceFocus = false,
  isFocusBoundary = false,
  focusBoundaryDirections,
  focusKey: propFocusKey,
  preferredChildFocusKey,
  onEnterPress = noop,
  onEnterRelease = noop,
  onArrowPress = () => true,
  onBackPress = noop,
  onFocus = noop,
  onBlur = noop,
  extraProps
}: UseFocusableConfig<P> = {}): UseFocusableResult => {

  const parentFocusKey = useFocusContext();

  const onEnterPressHandler = useCallback(
    (details: KeyPressDetails) => {
      onEnterPress(extraProps, details);
    },
    [onEnterPress, extraProps]
  );

  const onMouseClickHandler = useCallback(
    (details: KeyPressDetails) => {
      if (focusable) {
        onEnterPress(extraProps, details);
      }
    },
    [onEnterPress, focusable, extraProps]
  );

  const onEnterReleaseHandler = useCallback(() => {
    onEnterRelease(extraProps);
  }, [onEnterRelease, extraProps]);

  const onArrowPressHandler = useCallback(
    (direction: string, details: KeyPressDetails) =>
      onArrowPress(direction, extraProps, details),
    [extraProps, onArrowPress]
  );

  const onBackPressHandler = useCallback(
    (details: KeyPressDetails) => {
      if (onBackPress === noop) {
        try {
          SpatialNavigation.pressBackOnParent(details, parentFocusKey);
        } catch (e) {
          noop();
        }
        return;
      }
      onBackPress(extraProps, details);
    },
    [onBackPress, parentFocusKey, extraProps]
  );

  const onFocusHandler = useCallback(
    (layout: FocusableComponentLayout, details: FocusDetails) => {
      onFocus(layout, extraProps, details);
    },
    [extraProps, onFocus]
  );

  const onBlurHandler = useCallback(
    (layout: FocusableComponentLayout, details: FocusDetails) => {
      onBlur(layout, extraProps, details);
    },
    [extraProps, onBlur]
  );

  const ref = useRef(null);

  const [focused, setFocused] = useState(false);
  const [hasFocusedChild, setHasFocusedChild] = useState(false);

  /**
   * Either using the propFocusKey passed in, or generating a random one
   */
  const focusKey = useMemo(
    () => propFocusKey || uniqueId('sn:focusable-item-'),
    [propFocusKey]
  );

  const focusSelf = useCallback(
    (focusDetails: FocusDetails = {}) => {
      SpatialNavigation.setFocus(focusKey, focusDetails);
    },
    [focusKey]
  );

  const onMouseEnterHandler = useCallback(
    (event: MouseEvent) => {
      if (focusable) {
        SpatialNavigation.setFocus(focusKey, { event });
      }
    },
    [focusable, focusKey]
  );

  useEffect(() => {
    const node = ref.current;
    if (node && SpatialNavigation.isMouseEnabled() && typeof window !== 'undefined' && window.addEventListener) {
      node.addEventListener('mouseenter', onMouseEnterHandler);
      if (onMouseClickHandler) {
        node.addEventListener('click', onMouseClickHandler);
      }
    }
    SpatialNavigation.addFocusable({
      focusKey,
      node,
      parentFocusKey,
      preferredChildFocusKey,
      onEnterPress: onEnterPressHandler,
      onEnterRelease: onEnterReleaseHandler,
      onArrowPress: onArrowPressHandler,
      onBackPress: onEnterPressHandler,
      onFocus: onFocusHandler,
      onBlur: onBlurHandler,
      onUpdateFocus: (isFocused = false) => setFocused(isFocused),
      onUpdateHasFocusedChild: (isFocused = false) =>
        setHasFocusedChild(isFocused),
      saveLastFocusedChild,
      trackChildren,
      isFocusBoundary,
      focusBoundaryDirections,
      autoRestoreFocus,
      forceFocus,
      focusable
    });

    return () => {
      SpatialNavigation.removeFocusable({
        focusKey
      });
      if (node) {
        node.removeEventListener('mouseenter', onMouseEnterHandler);
        node.removeEventListener('click', onMouseClickHandler);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const node = ref.current;
    if (node && SpatialNavigation.isMouseEnabled() && typeof window !== 'undefined' && window.addEventListener) {
      node.addEventListener('mouseenter', onMouseEnterHandler);
      if (onMouseClickHandler) {
        node.addEventListener('click', onMouseClickHandler);
      }
    }

    SpatialNavigation.updateFocusable(focusKey, {
      node,
      preferredChildFocusKey,
      focusable,
      isFocusBoundary,
      focusBoundaryDirections,
      onEnterPress: onEnterPressHandler,
      onEnterRelease: onEnterReleaseHandler,
      onArrowPress: onArrowPressHandler,
      onBackPress: onBackPressHandler,
      onFocus: onFocusHandler,
      onBlur: onBlurHandler
    });

    return () => {
      if (node) {
        node.removeEventListener('mouseenter', onMouseEnterHandler);
        node.removeEventListener('click', onMouseClickHandler);
      }
    }; 
  }, [
    focusKey,
    preferredChildFocusKey,
    focusable,
    isFocusBoundary,
    focusBoundaryDirections,
    onEnterPressHandler,
    onEnterReleaseHandler,
    onArrowPressHandler,
    onBackPressHandler,
    onFocusHandler,
    onBlurHandler,
    onMouseEnterHandler,
    onMouseClickHandler
  ]);

  return {
    ref,
    focusSelf,
    focused,
    hasFocusedChild,
    focusKey // returns either the same focusKey as passed in, or generated one
  };
};

export const useFocusable = useFocusableHook;
