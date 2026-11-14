# Existing token inventory

Source snapshot: `16ebeab` (2026-11-12). Values are evaluated from the current modules, not sampled from images. See [audit](visual-unification-audit.md) for interpretation. These are current tokens, not the palette proposals.

## Legacy Calm Utility

Source: [theme.ts](../../src/constants/theme.ts).

### Colors

| Role | Light | Dark |
|---|---|---|
| background | `#FAFAF9` | `#121615` |
| surface | `#F1F3F1` | `#1D2421` |
| surfaceRaised | `#FFFFFF` | `#28312D` |
| surfaceMuted | `#E9EEEA` | `#18201C` |
| textPrimary | `#17211D` | `#EDF3EF` |
| textSecondary | `#4E5E55` | `#B7C5BC` |
| textMuted | `#59675E` | `#A2B1A8` |
| border | `#CBD3CE` | `#48594F` |
| borderStrong | `#77857C` | `#81968A` |
| accent | `#28634F` | `#9DCAB6` |
| accentMuted | `#E4F0E8` | `#263F33` |
| onAccent | `#FFFFFF` | `#12231B` |
| success | `#276242` | `#9CCBAD` |
| warning | `#825A14` | `#DFC18B` |
| danger | `#A53535` | `#F0ABAB` |
| info | `#315E88` | `#A6C5E3` |
| scrim | `rgba(16, 24, 20, 0.28)` | `rgba(0, 0, 0, 0.48)` |
| text | `#17211D` | `#EDF3EF` |
| backgroundElement | `#F1F3F1` | `#1D2421` |
| backgroundSelected | `#E9EEEA` | `#2E3933` |
| calendarTask | `#2563EB` | `#93C5FD` |
| calendarCommitment | `#B45309` | `#FBBF24` |
| calendarWorkPayment | `#0F766E` | `#5EEAD4` |

### SurfaceColors

| Role | Value |
|---|---|
| screen | `background` |
| grouped | `surface` |
| raised | `surfaceRaised` |
| overlay | `surfaceRaised` |

### StatusColors

| Role | Value |
|---|---|
| neutral | `textSecondary` |
| attention | `warning` |
| success | `success` |
| subdued | `textMuted` |
| danger | `danger` |
| info | `info` |

### Space

| Role | Value |
|---|---|
| micro | `2` |
| xs | `4` |
| sm | `8` |
| md | `12` |
| lg | `16` |
| xl | `24` |
| xxl | `32` |

### Radius

| Role | Value |
|---|---|
| small | `4` |
| control | `8` |
| surface | `8` |
| overlay | `12` |

### ControlSize

| Role | Value |
|---|---|
| touch | `44` |
| field | `48` |
| indicator | `24` |

### Typography

| Role | Value |
|---|---|
| screenTitle | `{"fontSize":32,"lineHeight":40,"fontWeight":"600"}` |
| sectionHeading | `{"fontSize":20,"lineHeight":28,"fontWeight":"600"}` |
| sheetTitle | `{"fontSize":18,"lineHeight":24,"fontWeight":"600"}` |
| cardTitle | `{"fontSize":16,"lineHeight":24,"fontWeight":"600"}` |
| body | `{"fontSize":16,"lineHeight":24,"fontWeight":"400"}` |
| secondary | `{"fontSize":14,"lineHeight":20,"fontWeight":"400"}` |
| metadata | `{"fontSize":14,"lineHeight":20,"fontWeight":"400"}` |
| button | `{"fontSize":14,"lineHeight":20,"fontWeight":"600"}` |
| input | `{"fontSize":16,"lineHeight":24,"fontWeight":"400"}` |
| metric | `{"fontSize":28,"lineHeight":36,"fontWeight":"600","fontVariant":["tabular-nums"]}` |

### Fonts

| Role | Value |
|---|---|
| sans | `system-ui` |
| serif | `ui-serif` |
| rounded | `ui-rounded` |
| mono | `ui-monospace` |

### Spacing

| Role | Value |
|---|---|
| half | `2` |
| one | `4` |
| two | `8` |
| three | `16` |
| four | `24` |
| five | `32` |
| six | `64` |

## Warm Editorial Hearth v2

Source: [design-system-v2.ts](../../src/constants/design-system-v2.ts).

### DesignColors

| Role | Light | Dark |
|---|---|---|
| canvas | `#F5F0EA` | `#151315` |
| surface | `#FFFCF8` | `#1B181A` |
| group | `#FBF5F0` | `#242024` |
| groupStrong | `#F7EDE8` | `#2B2429` |
| inset | `#F0E9E5` | `#191619` |
| control | `#F8F3EF` | `#2B272A` |
| selected | `#F1E1E8` | `#3C2B35` |
| textPrimary | `#241E1C` | `#F6F0ED` |
| textSecondary | `#6A5E59` | `#C9BDB8` |
| textMuted | `#746660` | `#AFA39E` |
| border | `#E4DAD4` | `#3A3337` |
| borderStrong | `#9B837B` | `#7F7078` |
| brand | `#7B425E` | `#DFA6BF` |
| brandStrong | `#68344E` | `#EDBAD0` |
| brandSoft | `#EBD8E1` | `#422E38` |
| onBrand | `#FFF9FB` | `#2A1720` |
| taskAccent | `#6670A5` | `#AEB7E8` |
| taskAccentSoft | `#E6E7F3` | `#303247` |
| taskText | `#505A8A` | `#AEB7E8` |
| fitnessAccent | `#B66F5D` | `#E2A08F` |
| fitnessAccentSoft | `#F2DDD6` | `#472D29` |
| fitnessText | `#8E4E3F` | `#E2A08F` |
| onFitness | `#151010` | `#2A1720` |
| attention | `#805619` | `#DFC18B` |
| attentionSoft | `#FBEACF` | `#4C3928` |
| danger | `#9B303E` | `#F0ABAB` |
| info | `#3D5E86` | `#B4CEE8` |
| shadow | `rgba(45, 28, 44, 0.14)` | `none` |

### Shape

| Role | Value |
|---|---|
| group | `16` |
| raised | `18` |
| control | `10` |
| inset | `8` |
| status | `8` |
| menu | `12` |
| sheet | `20` |
| fab | `28` |

### DesignSpace

| Role | Value |
|---|---|
| xs | `4` |
| sm | `8` |
| md | `12` |
| lg | `16` |
| section | `20` |
| xl | `24` |
| xxl | `32` |

### MotionTokens

| Role | Value |
|---|---|
| press | `120` |
| selection | `180` |
| indicator | `190` |
| insertion | `220` |
| expansion | `220` |
| menu | `160` |

### TouchTarget

| Role | Value |
|---|---|

### DesignTypography

| Role | Value |
|---|---|
| screenTitle | `{"fontSize":36,"lineHeight":46,"fontWeight":"600"}` |
| editorTitle | `{"fontSize":26,"lineHeight":34,"fontWeight":"600"}` |
| editorSection | `{"fontSize":20,"lineHeight":28,"fontWeight":"600"}` |
| fieldLabel | `{"fontSize":14,"lineHeight":20,"fontWeight":"600"}` |
| sectionHeading | `{"fontSize":20,"lineHeight":28,"fontWeight":"600"}` |
| cardTitle | `{"fontSize":16,"lineHeight":24,"fontWeight":"600"}` |
| sheetTitle | `{"fontSize":18,"lineHeight":24,"fontWeight":"600"}` |
| body | `{"fontSize":16,"lineHeight":24,"fontWeight":"400"}` |
| secondary | `{"fontSize":14,"lineHeight":20,"fontWeight":"400"}` |
| metadata | `{"fontSize":14,"lineHeight":20,"fontWeight":"400"}` |
| smallLabel | `{"fontSize":12,"lineHeight":18,"fontWeight":"600"}` |
| button | `{"fontSize":15,"lineHeight":22,"fontWeight":"600"}` |
| numeric | `{"fontSize":15,"lineHeight":22,"fontWeight":"600","fontVariant":["tabular-nums"]}` |
| metric | `{"fontSize":30,"lineHeight":38,"fontWeight":"600","fontVariant":["tabular-nums"]}` |
