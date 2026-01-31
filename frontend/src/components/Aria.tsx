import type { ReactNode } from "react";

import {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Menu,
  MenuItem,
  MenuTrigger,
  Modal,
  ModalOverlay,
  Popover,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  TextField,
  Input,
} from "react-aria-components";

export {
  Button,
  Dialog,
  DialogTrigger,
  Heading,
  Menu,
  MenuItem,
  MenuTrigger,
  Modal,
  ModalOverlay,
  Popover,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  TextField,
  Input,
};

export function IconButton(props: {
  "aria-label": string;
  onPress?: () => void;
  children: ReactNode;
  className?: string;
  isDisabled?: boolean;
}) {
  return (
    <Button
      aria-label={props["aria-label"]}
      onPress={props.onPress}
      className={props.className}
      isDisabled={props.isDisabled}
    >
      {props.children}
    </Button>
  );
}
