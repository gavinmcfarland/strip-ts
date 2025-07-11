import { stripTSFromString } from './src/strip-ts.ts';

async function testImportRemoval() {
    const testCode = `
import React, { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import Icon from "./components/Icon";
import Input from "./components/Input";
import Button from "./components/Button";

const App = () => {
  const [rectCount, setRectCount] = useState(5);
  const [nodeCount, setNodeCount] = useState(0);

  const styles = {
    container: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      width: "100%",
      flexDirection: "column"
    }
  };

  useEffect(() => {
    console.log('effect');
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.banner}>
        <Icon svg="plugma" size={38} />
        <Icon svg="plus" size={24} />
        <img src={reactLogo} width="44" height="44" alt="Svelte logo" />
      </div>
      <div style={styles.field}>
        <Input
          type="number"
          value={rectCount.toString()}
          onChange={(value) => setRectCount(Number(value))}
        />
        <Button
          onClick={() => console.log('clicked')}
          href={undefined}
          target={undefined}
          style={styles.createRectanglesInput}
        >
          Create Rectangles
        </Button>
      </div>
      <div style={styles.nodeCount}>
        <span>{nodeCount} nodes selected</span>
      </div>
    </div>
  );
};

export default App;
`;

    try {
        const result = await stripTSFromString(testCode, 'tsx');
        console.log('=== PROCESSED CODE ===');
        console.log(result);
        console.log('=== END ===');
    } catch (error) {
        console.error('Error:', error);
    }
}

testImportRemoval();
