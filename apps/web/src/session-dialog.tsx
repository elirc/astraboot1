import {useEffect,useRef,type ReactNode} from 'react';
import styles from './Workspace.module.css';
export function SessionDialog({children}:{children:ReactNode}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const dialog=ref.current!;dialog.showModal();return()=>dialog.close();},[]);return <dialog ref={ref} className={styles.sessionOverlay} aria-label="Sign in again" onCancel={e=>e.preventDefault()}>{children}</dialog>;}
