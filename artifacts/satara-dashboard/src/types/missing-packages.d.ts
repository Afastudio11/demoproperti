declare module "react-hook-form" {
  import * as React from "react";
  export type FieldValues = Record<string, unknown>;
  export type FieldPath<TFieldValues extends FieldValues = FieldValues> = string & keyof TFieldValues | string;
  export type ControllerProps<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> = {
    name: TName;
    render?: (props: any) => React.ReactElement;
    [key: string]: any;
  };
  export const Controller: React.ComponentType<any>;
  export const FormProvider: React.ComponentType<any>;
  export function useFormContext(): { getFieldState: (name: string, formState?: any) => any; formState: any };
}

declare module "@radix-ui/react-popover" {
  import * as React from "react";
  type Primitive = React.ForwardRefExoticComponent<any> & { displayName?: string };
  export const Root: Primitive;
  export const Trigger: Primitive;
  export const Anchor: Primitive;
  export const Portal: React.ComponentType<any>;
  export const Content: Primitive;
}

declare module "@radix-ui/react-radio-group" {
  import * as React from "react";
  type Primitive = React.ForwardRefExoticComponent<any> & { displayName?: string };
  export const Root: Primitive;
  export const Item: Primitive;
  export const Indicator: Primitive;
}

declare module "@radix-ui/react-toggle" {
  import * as React from "react";
  export const Root: React.ForwardRefExoticComponent<any> & { displayName?: string };
}
