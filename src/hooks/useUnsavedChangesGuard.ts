import { usePreventRemove } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";

export function useUnsavedChangesGuard() {
  const [active, setActive] = useState(false);
  const allowLeaveRef = useRef(false);

  usePreventRemove(active, ({ repeat }) => {
    if (allowLeaveRef.current) {
      setActive(false);
      repeat();
      return;
    }

    Alert.alert(
      "Abandonner les modifications ?",
      "Les informations saisies ne seront pas enregistrées.",
      [
        { text: "Continuer l’édition", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: () => {
            allowLeaveRef.current = true;
            setActive(false);
            repeat();
          },
        },
      ],
    );
  });

  const markDirty = useCallback(() => {
    setActive(true);
  }, []);

  const allowLeave = useCallback(() => {
    allowLeaveRef.current = true;
    setActive(false);
  }, []);

  return { markDirty, allowLeave };
}
