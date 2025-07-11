<script>export let href = undefined;
export let target = undefined;
export let style = {};
export let onClick = undefined;
export let variant = "primary";
export let disabled = false;
function handleClick(event) {
    if (!disabled && onClick) {
        onClick(event);
    }
}
$: buttonStyle: (Record) = {
    display: "block",
    borderRadius: "5px",
    border: "1px solid var(--figma-color-border)",
    padding: "0 7px",
    lineHeight: "22px",
    textDecoration: "none",
    color: "var(--figma-color-text)",
    backgroundColor: variant === "primary"
        ? "var(--figma-color-bg-brand)"
        : "var(--figma-color-bg-secondary)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? "0.6" : "1",
    ...style,
};
</script>

{#if href}
	<a
		{href}
		{target}
		style={buttonStyle}
		on:click={handleClick}
		class="button button-{variant}"
	>
		<slot />
	</a>
{:else}
	<button
		style={buttonStyle}
		on:click={handleClick}
		{disabled}
		class="button button-{variant}"
	>
		<slot />
	</button>
{/if}

<style>
	.button {
		font-family: inherit;
		transition: all 0.2s ease;
	}

	.button:hover:not(:disabled) {
		opacity: 0.8;
	}

	.button:active:not(:disabled) {
		transform: translateY(1px);
	}
</style>
