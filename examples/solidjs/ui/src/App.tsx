import type { Component } from "solid-js";
import { Routes, Route, A, Router, hashIntegration } from "@solidjs/router";

import logo from "./logo.svg";
import styles from "./App.module.css";

const App: Component = () => {
  return (
    <Router source={hashIntegration()}>
      <Routes>
        <Route path="/" component={Home} />
        <Route
          path="/about"
          element={<div>This site was made with Solid</div>}
        />
      </Routes>
    </Router>
  );
};

const Home: Component = () => {
  return (
    <div class={styles.App}>
      <header class={styles.header}>
        <img src={logo} class={styles.logo} alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          class={styles.link}
          href="https://github.com/solidjs/solid"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn Solid
        </a>
        <A href="/about">About</A>
      </header>
    </div>
  );
};

export default App;
