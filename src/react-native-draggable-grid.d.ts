declare module 'react-native-draggable-grid/built/src' {
  import type {ComponentType,ReactElement} from 'react';
  import type {StyleProp,ViewStyle} from 'react-native';
  export type DraggableGridItem={key:string;disabledDrag?:boolean;disabledReSorted?:boolean;[key:string]:unknown};
  export type DraggableGridProps<T extends DraggableGridItem>={numColumns:number;data:T[];renderItem:(item:T,order:number)=>ReactElement;itemHeight?:number;style?:StyleProp<ViewStyle>;onItemPress?:(item:T)=>void;onDragStart?:(item:T)=>void;onDragRelease?:(items:T[])=>void};
  export const DraggableGrid:ComponentType<DraggableGridProps<any>>;
}
